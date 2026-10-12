@echo off
title AttendAI - Starting Services
echo ===================================================
echo           Starting AttendAI Development
echo ===================================================
echo.

:: 1. Start Docker (PostgreSQL & Redis)
echo [1/3] Starting Database and Redis via Docker Compose...
docker compose up -d
if %errorlevel% neq 0 (
    echo [WARNING] Docker Compose failed or Docker Desktop is not running.
    echo If you are using a cloud database (Neon/Supabase), you can continue.
    echo.
) else (
    echo [OK] PostgreSQL and Redis containers started.
    echo.
)

:: 2. Start Backend API in a new terminal window
echo [2/3] Launching Backend API (Port 4000)...
start "AttendAI - Backend API (Port 4000)" cmd /k "cd /d %~dp0backend && npm run dev"

:: 3. Start Frontend in a new terminal window
echo [3/3] Launching Frontend PWA (Port 5173)...
start "AttendAI - Frontend PWA (Port 5173)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ===================================================
echo   AttendAI is starting up!
echo   - Backend:  http://localhost:4000
echo   - Frontend: http://localhost:5173
echo.
echo   Login Credentials:
echo     Admin:    admin@attendai.com    / Admin@123
echo     Teacher:  teacher1@attendai.com / Teacher@123
echo     Student:  student1@attendai.com / Student@123
echo ===================================================
echo.

timeout /t 3 >nul
start http://localhost:5173
exit
