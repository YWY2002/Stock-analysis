@echo off
cd /d "%~dp0"

:: Load .env file
if not exist .env (
    echo ERROR: .env file not found. Copy .env.example to .env and add your Twelve Data API key.
    pause
    exit /b 1
)

for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
    set "%%A=%%B"
)

if "%TWELVE_DATA_API_KEY%"=="" (
    echo ERROR: TWELVE_DATA_API_KEY not set in .env file.
    pause
    exit /b 1
)

echo Starting Ticker Service (Python :8001)...
start "Ticker-Service" cmd /k "cd /d "%~dp0ticker-service" && python -m uvicorn main:app --host 0.0.0.0 --port 8001"

echo Starting Indicator Service (Go :8002)...
start "Indicator-Service" cmd /k "cd /d "%~dp0indicator-service" && go run ."

echo Starting Frontend (Vite :5173)...
start "Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo All services started in separate windows:
echo   Frontend:   http://localhost:5173
echo   Ticker:     http://localhost:8001
echo   Indicators: http://localhost:8002
echo.
echo Close the service windows to stop them.
