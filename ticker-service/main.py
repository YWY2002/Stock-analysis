import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

API_KEY = os.environ.get("TWELVE_DATA_API_KEY", "")
if not API_KEY:
    raise RuntimeError("TWELVE_DATA_API_KEY environment variable is not set")

TWELVE_DATA_BASE = "https://api.twelvedata.com"

app = FastAPI(title="Ticker Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

VALID_INTERVALS = {
    "1min", "5min", "15min", "30min", "1h", "4h",
    "1day", "1week", "1month",
}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/ticker/{symbol}")
async def get_ticker(
    symbol: str,
    interval: str = Query("1day"),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    outputsize: int = Query(100, ge=1, le=5000),
):
    if interval not in VALID_INTERVALS:
        raise HTTPException(400, f"Invalid interval. Must be one of: {', '.join(sorted(VALID_INTERVALS))}")

    params = {
        "symbol": symbol.upper(),
        "interval": interval,
        "outputsize": outputsize,
        "apikey": API_KEY,
        "format": "JSON",
    }
    if start_date:
        params["start_date"] = start_date
    if end_date:
        params["end_date"] = end_date

    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{TWELVE_DATA_BASE}/time_series", params=params, timeout=15.0)

    if resp.status_code != 200:
        raise HTTPException(502, f"Twelve Data API returned status {resp.status_code}")

    body = resp.json()

    if "code" in body and body["code"] != 200:
        raise HTTPException(400, body.get("message", "Twelve Data API error"))

    if "values" not in body:
        raise HTTPException(400, "No data returned for this symbol/interval")

    # Twelve Data returns newest-first; reverse to oldest-first
    raw_values = list(reversed(body["values"]))

    data = []
    for bar in raw_values:
        data.append({
            "datetime": bar["datetime"],
            "open": float(bar["open"]),
            "high": float(bar["high"]),
            "low": float(bar["low"]),
            "close": float(bar["close"]),
            "volume": int(float(bar["volume"])),
        })

    return {
        "symbol": symbol.upper(),
        "interval": interval,
        "data": data,
    }
