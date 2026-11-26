#!/usr/bin/env bash
# ===============================================================================
# AttendAI - Enterprise Clean Shutdown Script (Linux / macOS)
# Stops ports 4000 (Backend), 5173 (Frontend), and 5174 (Student App)
# ===============================================================================

echo "==============================================================================="
echo "                AttendAI - Clean Shutdown Utility"
echo "==============================================================================="
echo ""
echo "Stopping Node.js services on ports 4000, 5173, and 5174..."

for PORT in 4000 5173 5174; do
    PID=$(lsof -ti :$PORT 2>/dev/null || true)
    if [ -n "$PID" ]; then
        echo "  - Terminating process on port $PORT (PID: $PID)..."
        kill -9 $PID 2>/dev/null || true
    fi
done

echo ""
echo "==============================================================================="
echo "            AttendAI services have been cleanly stopped."
echo "==============================================================================="
