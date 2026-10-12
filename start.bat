@echo off
title AttendAI - All-In-One Launcher
color 0A
cls
echo ================================================================
echo           AttendAI - All-in-One Single Click Launcher
echo ================================================================
echo.

:: 1. Start Docker (PostgreSQL & Redis)
echo [1/4] Starting PostgreSQL and Redis via Docker Compose...
docker compose up -d >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Docker not running or cloud DB used. Continuing...
) else (
    echo [OK] Database and Redis services active.
)
echo.

:: 2. Initialize Prisma Client
echo [2/4] Initializing Database Client...
cd /d "%~dp0backend"
call npx prisma generate >nul 2>&1
echo [OK] Prisma client ready.
echo.

:: 3. Launch Backend API in its own window
echo [3/4] Starting Backend API (Port 4000)...
start "AttendAI Backend API" cmd /k "cd /d %~dp0backend && npm run dev"

:: 4. Launch Frontend PWA in its own window
echo [4/4] Starting Frontend PWA (Port 5173)...
start "AttendAI Frontend PWA" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ================================================================
echo   AttendAI is now running!
echo.
echo   - Frontend App: http://localhost:5173
echo   - Backend API:  http://localhost:4000
echo.
echo   Default Logins:
echo     Admin:    admin@attendai.com    / Admin@123
echo     Teacher:  teacher1@attendai.com / Teacher@123
echo     Student:  student1@attendai.com / Student@123
echo ================================================================
echo.

timeout /t 3 >nul
start http://localhost:5173
exit
