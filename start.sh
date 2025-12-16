#!/bin/bash

# Hospital ERP - Quick Start Script
# Usage: ./start.sh

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PORT=4000
FRONTEND_PORT=5173

echo "=========================================="
echo "  Hospital ERP - Starting Services"
echo "=========================================="

# Kill any existing processes on our ports
echo "[1/5] Cleaning up existing processes..."
lsof -ti:$BACKEND_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:$FRONTEND_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1

# Check if Docker is running
echo "[2/5] Checking Docker..."
if ! docker info > /dev/null 2>&1; then
    echo "  -> Starting Docker Desktop..."
    open -a Docker
    echo "  -> Waiting for Docker to start (30 seconds)..."
    sleep 30
fi

# Start PostgreSQL
echo "[3/5] Starting PostgreSQL database..."
cd "$PROJECT_DIR"
docker-compose up -d
sleep 3

# Check database connection
echo "[4/5] Verifying database connection..."
until docker exec hms_db pg_isready -U postgres > /dev/null 2>&1; do
    echo "  -> Waiting for database..."
    sleep 2
done
echo "  -> Database is ready!"

# Start Backend
echo "[5/5] Starting services..."
cd "$PROJECT_DIR/backend"
npm run dev > /tmp/hms_backend.log 2>&1 &
BACKEND_PID=$!
echo "  -> Backend starting (PID: $BACKEND_PID)..."

# Start Frontend
cd "$PROJECT_DIR/frontend"
npm run dev > /tmp/hms_frontend.log 2>&1 &
FRONTEND_PID=$!
echo "  -> Frontend starting (PID: $FRONTEND_PID)..."

# Wait for services to be ready
sleep 5

echo ""
echo "=========================================="
echo "  Hospital ERP is now running!"
echo "=========================================="
echo ""
echo "  Frontend:  http://localhost:$FRONTEND_PORT"
echo "  Backend:   http://localhost:$BACKEND_PORT"
echo "  API Docs:  http://localhost:$BACKEND_PORT/api/health"
echo ""
echo "  Login Credentials:"
echo "  ------------------"
echo "  Username: admin"
echo "  Password: password123"
echo ""
echo "  Logs:"
echo "  - Backend:  tail -f /tmp/hms_backend.log"
echo "  - Frontend: tail -f /tmp/hms_frontend.log"
echo ""
echo "  To stop: ./stop.sh"
echo "=========================================="

# Open browser
if command -v open &> /dev/null; then
    sleep 2
    open "http://localhost:$FRONTEND_PORT"
fi
