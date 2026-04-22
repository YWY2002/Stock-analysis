import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts';
import { BASE_CHART_OPTIONS, CHART_COLORS } from '../utils/chartConfig';

function toChartTime(datetime) {
  return datetime.length > 10
    ? Math.floor(new Date(datetime).getTime() / 1000)
    : datetime;
}

function computeSma(data, period) {
  if (period < 1 || data.length < period) return [];
  const out = [];
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i].close;
    if (i >= period) sum -= data[i - period].close;
    if (i >= period - 1) {
      out.push({ time: toChartTime(data[i].datetime), value: sum / period });
    }
  }
  return out;
}

function computeSmma(data, period) {
  if (period < 1 || data.length < period) return [];
  const out = [];
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i].close;
  let prev = sum / period;
  out.push({ time: toChartTime(data[period - 1].datetime), value: prev });
  for (let i = period; i < data.length; i++) {
    prev = (prev * (period - 1) + data[i].close) / period;
    out.push({ time: toChartTime(data[i].datetime), value: prev });
  }
  return out;
}

function computeMa(data, type, period) {
  if (type === 'smma') return computeSmma(data, period);
  return computeSma(data, period);
}

const PriceChart = forwardRef(function PriceChart({ data, mas = [], hideTimeAxis, onTimeRangeChange, onCrosshairMove }, ref) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const mainSeriesRef = useRef(null);
  const maSeriesRef = useRef({});

  useImperativeHandle(ref, () => ({
    syncRange(range) {
      chartRef.current?.timeScale().setVisibleLogicalRange(range);
    },
    getChart() {
      return chartRef.current;
    },
    getMainSeries() {
      return mainSeriesRef.current;
    },
  }));

  useEffect(() => {
    if (!containerRef.current || !data?.length) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      ...BASE_CHART_OPTIONS,
      height: 400,
      timeScale: {
        ...BASE_CHART_OPTIONS.timeScale,
        visible: !hideTimeAxis,
      },
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: CHART_COLORS.candleUp,
      downColor: CHART_COLORS.candleDown,
      borderUpColor: CHART_COLORS.candleUp,
      borderDownColor: CHART_COLORS.candleDown,
      wickUpColor: CHART_COLORS.candleUp,
      wickDownColor: CHART_COLORS.candleDown,
    });
    mainSeriesRef.current = candleSeries;

    candleSeries.setData(
      data.map((d) => ({
        time: toChartTime(d.datetime),
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }))
    );

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: CHART_COLORS.volume,
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeries.setData(
      data.map((d) => ({
        time: toChartTime(d.datetime),
        value: d.volume,
        color: d.close >= d.open ? CHART_COLORS.candleUp + '40' : CHART_COLORS.candleDown + '40',
      }))
    );

    chart.timeScale().fitContent();

    if (onTimeRangeChange) {
      chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (range) onTimeRangeChange(range);
      });
    }

    if (onCrosshairMove) {
      chart.subscribeCrosshairMove(onCrosshairMove);
    }

    return () => {
      chart.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
      maSeriesRef.current = {};
    };
  }, [data]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !data?.length) return;

    const liveIds = new Set(mas.map((m) => String(m.id)));
    for (const id of Object.keys(maSeriesRef.current)) {
      if (!liveIds.has(id)) {
        chart.removeSeries(maSeriesRef.current[id].series);
        delete maSeriesRef.current[id];
      }
    }

    for (const ma of mas) {
      const id = String(ma.id);
      const type = ma.type ?? 'sma';
      const existing = maSeriesRef.current[id];
      if (!existing) {
        const series = chart.addSeries(LineSeries, {
          color: ma.color,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        series.setData(computeMa(data, type, ma.period));
        maSeriesRef.current[id] = { series, type, period: ma.period, color: ma.color };
      } else {
        if (existing.color !== ma.color) {
          existing.series.applyOptions({ color: ma.color });
          existing.color = ma.color;
        }
        if (existing.period !== ma.period || existing.type !== type) {
          existing.series.setData(computeMa(data, type, ma.period));
          existing.period = ma.period;
          existing.type = type;
        }
      }
    }
  }, [data, mas]);

  return (
    <div className="chart-wrapper">
      <h3>Price (OHLCV)</h3>
      <div ref={containerRef} />
    </div>
  );
});

export default PriceChart;
