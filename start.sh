#!/usr/bin/env bash
echo "========================================================"
echo "  DealFlow360 — Self-Governing Sales Ops Engine"
echo "========================================================"
echo ""

BACKEND_DIR="backend"
[ -d "Backend" ] && BACKEND_DIR="Backend"

FRONTEND_DIR="frontend"
[ -d "Frontend" ] && FRONTEND_DIR="Frontend"

if [ "$1" == "docker" ]; then
    echo "Starting via Docker Compose..."
    docker compose up --build
else
    echo "Starting Backend and Frontend in background..."
    (cd "$BACKEND_DIR" && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000) &
    (cd "$FRONTEND_DIR" && npm install && npm run dev) &
    wait
fi
