#!/usr/bin/env bash
# ===============================================================================
# AttendAI - Enterprise Multi-Service Startup Script (Linux / macOS)
# Services: Backend (4000), Faculty/Admin Frontend (5173), Student PWA (5174)
# ===============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==============================================================================="
echo "                AttendAI - Smart Attendance & College ERP System"
echo "                      Linux / macOS Universal Launcher"
echo "==============================================================================="
echo ""

# 1. Check Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "[ERROR] Node.js is not installed. Please install Node.js v20+ LTS."
    exit 1
fi
echo "[OK] Node.js version $(node -v) detected."

# 2. Check Backend Environment Configuration
if [ ! -f "backend/.env" ]; then
    echo "[NOTICE] backend/.env not found. Creating from .env.example..."
    cp backend/.env.example backend/.env
fi

# 3. Check Dependencies
echo "[INFO] Verifying package dependencies..."
[ ! -d "backend/node_modules" ] && (cd backend && npm install)
[ ! -d "frontend/node_modules" ] && (cd frontend && npm install)
[ ! -d "student-app/node_modules" ] && (cd student-app && npm install)

# 4. Prisma Client Generation & Migrations
echo "[INFO] Generating Prisma Client and applying migrations..."
(cd backend && npx prisma generate >/dev/null 2>&1 || npx prisma generate)
(cd backend && npx prisma migrate deploy >/dev/null 2>&1 || true)

# 5. Launch Microservices in background
echo "[INFO] Launching AttendAI Microservices..."

# Port 4000: Backend API
if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "[OK] Backend API is already running on port 4000."
else
    echo "  - Starting Backend API on http://localhost:4000"
    (cd backend && npm run dev) >/dev/null 2>&1 &
fi

# Port 5173: Faculty / Admin Frontend
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "[OK] Faculty/Admin Portal is already running on port 5173."
else
    echo "  - Starting Faculty/Admin Portal on http://localhost:5173"
    (cd frontend && npm run dev) >/dev/null 2>&1 &
fi

# Port 5174: Dedicated Student App
if lsof -Pi :5174 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "[OK] Dedicated Student Portal is already running on port 5174."
else
    echo "  - Starting Dedicated Student Mobile PWA on http://localhost:5174"
    (cd student-app && npm run dev -- --port 5174) >/dev/null 2>&1 &
fi

echo ""
echo "==============================================================================="
echo "                       AttendAI is running successfully!"
echo "==============================================================================="
echo ""
echo "  [Web Endpoints]"
echo "    - Faculty/Admin/Guard Portal:  http://localhost:5173"
echo "    - Dedicated Student Mobile PWA: http://localhost:5174"
echo "    - Backend API:                  http://localhost:4000"
echo "    - Guard Kiosk Scanner:          http://localhost:5173/guard"
echo ""
echo "  [Demo Credentials]"
echo "    * Admin:       admin@attendai.com     / Admin@123"
echo "    * HOD:         hod.cs@attendai.com    / Hod@123"
echo "    * Faculty:     teacher1@attendai.com  / Teacher@123"
echo "    * Student:     student1@attendai.com  / Student@123"
echo "==============================================================================="
echo "Run ./stop.sh to terminate all running services."
