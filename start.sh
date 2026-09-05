#!/usr/bin/env bash
echo "========================================================"
echo "  DealFlow360 — Self-Governing Sales Ops Engine"
echo "========================================================"
echo ""

if [ "$1" == "docker" ]; then
    echo "Starting via Docker Compose..."
    docker compose up --build
else
    echo "Starting Backend and Frontend in background..."
    (cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000) &
    (cd frontend && npm install && npm run dev) &
    wait
fi
