#!/bin/bash

# Hospital ERP - Stop Script
# Usage: ./stop.sh

echo "Stopping Hospital ERP services..."

# Kill processes on ports
lsof -ti:4000 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:5173 2>/dev/null | xargs kill -9 2>/dev/null || true

# Stop Docker containers
docker-compose down 2>/dev/null || true

echo "All services stopped."
