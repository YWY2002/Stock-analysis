package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"net/url"
	"strings"
)

const tickerServiceURL = "http://localhost:8001"

// PriceBar represents a single OHLCV bar from the ticker service.
type PriceBar struct {
	Datetime string  `json:"datetime"`
	Open     float64 `json:"open"`
	High     float64 `json:"high"`
	Low      float64 `json:"low"`
	Close    float64 `json:"close"`
	Volume   int64   `json:"volume"`
}

// IndicatorPoint is a single data point for an indicator.
type IndicatorPoint struct {
	Datetime string  `json:"datetime"`
	Value    float64 `json:"value"`
}

// TickerResponse matches the ticker service JSON shape.
type TickerResponse struct {
	Symbol   string     `json:"symbol"`
	Interval string     `json:"interval"`
	Data     []PriceBar `json:"data"`
}

// IndicatorResponse is the response shape for /indicators/{symbol}.
type IndicatorResponse struct {
	Symbol    string                        `json:"symbol"`
	Interval  string                        `json:"interval"`
	PriceData []PriceBar                    `json:"price_data"`
	Indicators map[string][]IndicatorPoint  `json:"indicators"`
}

// computeAD calculates Accumulation/Distribution line.
func computeAD(bars []PriceBar) []IndicatorPoint {
	points := make([]IndicatorPoint, len(bars))
	var cumAD float64
	for i, b := range bars {
		rng := b.High - b.Low
		var mfm float64
		if rng > 0 {
			mfm = ((b.Close - b.Low) - (b.High - b.Close)) / rng
		}
		cumAD += mfm * float64(b.Volume)
		points[i] = IndicatorPoint{Datetime: b.Datetime, Value: math.Round(cumAD*100) / 100}
	}
	return points
}

// computeOBV calculates On Balance Volume.
func computeOBV(bars []PriceBar) []IndicatorPoint {
	points := make([]IndicatorPoint, len(bars))
	if len(bars) == 0 {
		return points
	}
	var obv float64 = float64(bars[0].Volume)
	points[0] = IndicatorPoint{Datetime: bars[0].Datetime, Value: obv}
	for i := 1; i < len(bars); i++ {
		switch {
		case bars[i].Close > bars[i-1].Close:
			obv += float64(bars[i].Volume)
		case bars[i].Close < bars[i-1].Close:
			obv -= float64(bars[i].Volume)
		}
		points[i] = IndicatorPoint{Datetime: bars[i].Datetime, Value: obv}
	}
	return points
}

// computeVWAP calculates Volume Weighted Average Price.
// For intraday intervals, it resets at the start of each new day.
// For daily+ intervals, each bar's VWAP is the typical price.
func computeVWAP(bars []PriceBar, interval string) []IndicatorPoint {
	points := make([]IndicatorPoint, len(bars))
	isIntraday := strings.Contains(interval, "min") || interval == "1h" || interval == "4h"

	var cumTPV, cumVol float64
	var prevDate string

	for i, b := range bars {
		tp := (b.High + b.Low + b.Close) / 3.0

		if isIntraday {
			// Extract date portion (first 10 chars of "YYYY-MM-DD HH:MM:SS")
			date := b.Datetime
			if len(date) >= 10 {
				date = date[:10]
			}
			if date != prevDate {
				cumTPV = 0
				cumVol = 0
				prevDate = date
			}
			cumTPV += tp * float64(b.Volume)
			cumVol += float64(b.Volume)
			if cumVol > 0 {
				points[i] = IndicatorPoint{Datetime: b.Datetime, Value: math.Round(cumTPV/cumVol*100) / 100}
			} else {
				points[i] = IndicatorPoint{Datetime: b.Datetime, Value: tp}
			}
		} else {
			// Daily or higher: VWAP = typical price per bar
			points[i] = IndicatorPoint{Datetime: b.Datetime, Value: math.Round(tp*100) / 100}
		}
	}
	return points
}

func handleIndicators(w http.ResponseWriter, r *http.Request) {
	symbol := r.PathValue("symbol")
	if symbol == "" {
		http.Error(w, `{"error":"symbol is required"}`, http.StatusBadRequest)
		return
	}

	// Parse query params
	q := r.URL.Query()
	indicatorList := q.Get("indicators")
	if indicatorList == "" {
		indicatorList = "ad,obv,vwap"
	}
	requested := make(map[string]bool)
	for _, ind := range strings.Split(indicatorList, ",") {
		ind = strings.TrimSpace(strings.ToLower(ind))
		if ind == "ad" || ind == "obv" || ind == "vwap" {
			requested[ind] = true
		}
	}
	if len(requested) == 0 {
		http.Error(w, `{"error":"no valid indicators specified (ad, obv, vwap)"}`, http.StatusBadRequest)
		return
	}

	interval := q.Get("interval")
	if interval == "" {
		interval = "1day"
	}

	// Build ticker service URL
	params := url.Values{}
	params.Set("interval", interval)
	if v := q.Get("start_date"); v != "" {
		params.Set("start_date", v)
	}
	if v := q.Get("end_date"); v != "" {
		params.Set("end_date", v)
	}
	if v := q.Get("outputsize"); v != "" {
		params.Set("outputsize", v)
	}

	tickerURL := fmt.Sprintf("%s/ticker/%s?%s", tickerServiceURL, url.PathEscape(strings.ToUpper(symbol)), params.Encode())

	resp, err := http.Get(tickerURL)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"failed to reach ticker service: %s"}`, err.Error()), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, `{"error":"failed to read ticker service response"}`, http.StatusBadGateway)
		return
	}

	if resp.StatusCode != 200 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(body)
		return
	}

	var tickerResp TickerResponse
	if err := json.Unmarshal(body, &tickerResp); err != nil {
		http.Error(w, `{"error":"failed to parse ticker service response"}`, http.StatusBadGateway)
		return
	}

	// Compute requested indicators
	indicators := make(map[string][]IndicatorPoint)
	if requested["ad"] {
		indicators["ad"] = computeAD(tickerResp.Data)
	}
	if requested["obv"] {
		indicators["obv"] = computeOBV(tickerResp.Data)
	}
	if requested["vwap"] {
		indicators["vwap"] = computeVWAP(tickerResp.Data, interval)
	}

	result := IndicatorResponse{
		Symbol:     tickerResp.Symbol,
		Interval:   tickerResp.Interval,
		PriceData:  tickerResp.Data,
		Indicators: indicators,
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
	w.Header().Set("Access-Control-Allow-Methods", "GET")
	json.NewEncoder(w).Encode(result)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok"}`))
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /indicators/{symbol}", handleIndicators)
	mux.HandleFunc("GET /health", handleHealth)

	log.Println("Indicator service starting on :8002")
	if err := http.ListenAndServe(":8002", mux); err != nil {
		log.Fatal(err)
	}
}
