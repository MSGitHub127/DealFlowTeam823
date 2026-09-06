@echo off
echo ========================================================
echo   DealFlow360 — Self-Governing Sales Ops Engine
echo ========================================================
echo.

REM Check if Docker compose is requested or native execution
choice /C 12 /M "Select Startup Mode: [1] Docker Compose (PostgreSQL+FastAPI+Next/Vite) or [2] Direct Native Python/Node: "
if errorlevel 2 goto NATIVE
if errorlevel 1 goto DOCKER

:DOCKER
echo Starting via Docker Compose...
docker compose up --build
goto END

:NATIVE
echo Starting Native Backend and Frontend...
start cmd /k "cd backend && python -m pip install -r requirements.txt && python -m uvicorn app.main:app --reload --port 8000"
start cmd /k "cd frontend && npm install && npm run dev"
echo Backend running on http://localhost:8000/docs
echo Frontend running on http://localhost:5173
goto END

:END
