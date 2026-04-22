#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Load env vars from .env
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

if [ -z "$TWELVE_DATA_API_KEY" ]; then
  echo "ERROR: TWELVE_DATA_API_KEY not set. Copy .env.example to .env and add your key."
  exit 1
fi

# Kill all child processes on exit
trap 'kill 0' EXIT

echo "Starting Ticker Service (Python :8001)..."
cd ticker-service
python -m uvicorn main:app --host 0.0.0.0 --port 8001 &
cd ..

echo "Starting Indicator Service (Go :8002)..."
cd indicator-service
go run . &
cd ..

echo "Starting Frontend (Vite :5173)..."
cd frontend
npm run dev &
cd ..

echo ""
echo "All services started:"
echo "  Frontend:   http://localhost:5173"
echo "  Ticker:     http://localhost:8001"
echo "  Indicators: http://localhost:8002"
echo ""
echo "Press Ctrl+C to stop all services."
wait
