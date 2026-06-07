#!/bin/bash

echo "========================================================="
echo "  Starting Demand Planning & Forecasting SaaS Platform  "
echo "========================================================="
echo ""

# Terminate existing servers on these ports if necessary
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null

echo "[1/2] Starting Python FastAPI Backend (Port 8000)..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt &> /dev/null
uvicorn main:app --port 8000 &
cd ..

echo "[2/2] Starting React Next.js Frontend (Port 3000)..."
cd frontend
npm run dev

echo ""
echo "Platform is fully operational!"
echo "Data ingested in the React App will directly query the local SQLite DB via FastAPI."
echo "Press Ctrl+C to shut down all processes."

wait
