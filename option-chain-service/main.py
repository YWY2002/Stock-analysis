import os
import time

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

API_KEY = os.environ.get("POLYGON_API_KEY", "")
if not API_KEY:
    raise RuntimeError("POLYGON_API_KEY environment variable is not set")

POLYGON_BASE = "https://api.polygon.io"

app = FastAPI(title="Option Chain Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


EXPIRATIONS_TTL = 3600  # 1 hour — expirations change at most daily
CHAIN_TTL = 60          # 60s — chain volume updates intraday, but avoid refetch spam
_cache: dict[str, tuple[float, object]] = {}


def _cache_get(key: str, ttl: int):
    entry = _cache.get(key)
    if entry is None:
        return None
    ts, value = entry
    if time.time() - ts > ttl:
        _cache.pop(key, None)
        return None
    return value


def _cache_set(key: str, value):
    _cache[key] = (time.time(), value)


@app.get("/health")
async def health():
    return {"status": "ok"}


async def _paginate(client: httpx.AsyncClient, url: str, params: dict) -> list:
    # Polygon paginates with a `next_url` that already contains the original
    # query params except apiKey; we must re-append apiKey on each follow-up.
    results: list = []
    next_url: str | None = url
    next_params: dict | None = params
    while next_url:
        resp = await client.get(next_url, params=next_params, timeout=15.0)
        if resp.status_code != 200:
            try:
                body = resp.json()
                msg = body.get("error") or body.get("message") or resp.text
            except Exception:
                msg = resp.text
            raise HTTPException(502, f"Polygon API {resp.status_code}: {msg}")
        body = resp.json()
        results.extend(body.get("results") or [])
        next_url = body.get("next_url")
        next_params = {"apiKey": API_KEY} if next_url else None
    return results


@app.get("/expirations/{underlying}")
async def get_expirations(underlying: str):
    symbol = underlying.upper()
    cache_key = f"exp:{symbol}"
    cached = _cache_get(cache_key, EXPIRATIONS_TTL)
    if cached is not None:
        return cached

    params = {
        "underlying_ticker": symbol,
        "limit": 1000,
        "expired": "false",
        "apiKey": API_KEY,
    }
    url = f"{POLYGON_BASE}/v3/reference/options/contracts"

    async with httpx.AsyncClient() as client:
        results = await _paginate(client, url, params)

    expirations = sorted({r["expiration_date"] for r in results if r.get("expiration_date")})
    payload = {"underlying": symbol, "expirations": expirations}
    _cache_set(cache_key, payload)
    return payload


@app.get("/chain/{underlying}")
async def get_option_chain(
    underlying: str,
    expiration: str = Query(..., description="Expiration date YYYY-MM-DD"),
):
    symbol = underlying.upper()
    cache_key = f"chain:{symbol}:{expiration}"
    cached = _cache_get(cache_key, CHAIN_TTL)
    if cached is not None:
        return cached

    params = {
        "expiration_date": expiration,
        "limit": 250,
        "apiKey": API_KEY,
    }
    url = f"{POLYGON_BASE}/v3/snapshot/options/{symbol}"

    async with httpx.AsyncClient() as client:
        results = await _paginate(client, url, params)

    # Group by strike: {strike: {"call_volume": n, "put_volume": n}}
    by_strike: dict[float, dict] = {}
    for r in results:
        details = r.get("details") or {}
        strike = details.get("strike_price")
        contract_type = details.get("contract_type")  # "call" | "put"
        if strike is None or contract_type not in ("call", "put"):
            continue
        day = r.get("day") or {}
        volume = int(day.get("volume") or 0)
        bucket = by_strike.setdefault(strike, {"call_volume": 0, "put_volume": 0})
        if contract_type == "call":
            bucket["call_volume"] += volume
        else:
            bucket["put_volume"] += volume

    chain = [
        {"strike": strike, "call_volume": v["call_volume"], "put_volume": v["put_volume"]}
        for strike, v in sorted(by_strike.items(), key=lambda kv: kv[0])
    ]

    payload = {
        "underlying": symbol,
        "expiration": expiration,
        "chain": chain,
    }
    _cache_set(cache_key, payload)
    return payload
