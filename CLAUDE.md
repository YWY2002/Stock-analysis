# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal stock analysis web app using microservice architecture. Displays candlestick charts with technical indicators (AD, OBV, VWAP) for user-selected tickers. Data sourced from Twelve Data API.

## Architecture

```
Frontend (React+Vite :5173) → Indicator Service (Go :8002) → Ticker Service (Python :8001) → Twelve Data API
```

- **Ticker Service** (Python/FastAPI, port 8001): Fetches OHLCV data from Twelve Data, normalizes it (strings→floats, reverses to ascending order)
- **Indicator Service** (Go stdlib, port 8002): Calls ticker service, computes AD/OBV/VWAP, returns combined response
- **Frontend** (React/Vite, port 5173): TradingView lightweight-charts for candlestick + indicator panels, Vite proxy routes `/api/*` to backends

## Setup

```bash
# 1. Create .env from example and add your Twelve Data API key
cp .env.example .env

# 2. Install Python deps
cd ticker-service && pip install -r requirements.txt && cd ..

# 3. Install frontend deps
cd frontend && npm install && cd ..

# 4. Go indicator service has no external deps (stdlib only)
```

## Running

**Option A — start.bat (Windows, recommended):**
```
start.bat
```

**Option B — start.sh (Git Bash only, NOT WSL):**
```bash
bash start.sh
```

**Option C — run each service in its own terminal:**
```bash
# Terminal 1: Ticker service
cd ticker-service && python -m uvicorn main:app --port 8001

# Terminal 2: Indicator service
cd indicator-service && go run .

# Terminal 3: Frontend
cd frontend && npm run dev
```

## API Endpoints

- `GET /ticker/{symbol}?interval=1day&outputsize=100&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` — raw OHLCV
- `GET /indicators/{symbol}?indicators=ad,obv,vwap&interval=1day&outputsize=100` — price data + computed indicators
- `GET /health` on both services

## Key Details

- Twelve Data free tier: 800 req/day, 8 req/min
- Vite dev proxy handles CORS: frontend calls `/api/indicators/...` and `/api/ticker/...`, Vite rewrites and forwards
- Both backends also set CORS headers for direct browser access during debugging
- Go indicator service uses Go 1.22+ `http.ServeMux` path patterns (e.g., `GET /indicators/{symbol}`)
- lightweight-charts requires `time` as `YYYY-MM-DD` string for daily data, Unix timestamp for intraday
- Chart panels are synced via `subscribeVisibleLogicalRangeChange`
