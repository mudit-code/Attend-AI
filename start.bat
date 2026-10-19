@echo off
title AttendAI - All-In-One Enterprise Launcher
color 0B
cls

echo ===============================================================================
echo                AttendAI - Smart Attendance ^& College ERP System
echo                     Offline-First PWA ^| Windows Launcher
echo ===============================================================================
echo.

:: 1. Verify Node.js Environment
echo [1/6] Checking Node.js installation...
where node >nul 2>&1
if errorlevel 1 (
    color 0C
    echo [ERROR] Node.js is not installed or not found in system PATH.
    echo Please download and install Node.js v20+ LTS from: https://nodejs.org
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo [OK] Node.js is active (%NODE_VER%).
echo.

:: 2. Check Backend Environment Configuration
echo [2/6] Verifying Backend environment configuration...
if not exist "%~dp0backend\.env" (
    echo [NOTICE] backend\.env not found. Creating from .env.example...
    copy "%~dp0backend\.env.example" "%~dp0backend\.env" >nul
    echo [OK] backend\.env created with default settings.
) else (
    echo [OK] backend\.env verified.
)
echo.

:: 3. Check Dependencies (node_modules)
echo [3/6] Checking package dependencies...
if not exist "%~dp0backend\node_modules" (
    echo [INFO] Installing backend dependencies - this may take a minute...
    cd /d "%~dp0backend"
    call npm install
) else (
    echo [OK] Backend dependencies installed.
)

if not exist "%~dp0frontend\node_modules" (
    echo [INFO] Installing frontend dependencies - this may take a minute...
    cd /d "%~dp0frontend"
    call npm install
) else (
    echo [OK] Frontend dependencies installed.
)
cd /d "%~dp0"
echo.

:: 4. Start Docker Containers (PostgreSQL & Redis)
echo [4/6] Booting PostgreSQL 16 ^& Redis 7 containers...
where docker >nul 2>&1
if errorlevel 1 (
    echo [INFO] Docker not found in system PATH.
    echo        If using local PostgreSQL / Redis or cloud DB, verify connection settings.
) else (
    docker compose -f "%~dp0docker-compose.yml" up -d >nul 2>&1
    if errorlevel 1 (
        echo [WARN] Docker engine is not running or failed to start containers.
        echo        Assuming existing local PostgreSQL/Redis or cloud database.
    ) else (
        echo [OK] PostgreSQL and Redis containers are running.
    )
)
echo.

:: 5. Initialize Prisma Database Client
echo [5/6] Generating Prisma ORM Client...
cd /d "%~dp0backend"
call npx prisma generate >nul 2>&1
if errorlevel 1 (
    echo [WARN] Prisma client generation encountered an issue. Retrying with full log:
    call npx prisma generate
) else (
    echo [OK] Prisma client generated.
)
cd /d "%~dp0"
echo.

:: 6. Launch Backend and Frontend Dev Servers
echo [6/6] Launching AttendAI Microservices...

:: Check if port 4000 is already in use
netstat -ano | findstr /R /C:":4000 .*LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo [OK] Backend API is already running on port 4000.
) else (
    echo   - Starting Backend API on http://localhost:4000
    start "AttendAI Backend API [Port 4000]" /D "%~dp0backend" cmd /k "npm run dev"
)

:: Check if port 5173 is already in use
netstat -ano | findstr /R /C:":5173 .*LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo [OK] Frontend PWA is already running on port 5173.
) else (
    echo   - Starting Frontend PWA on http://localhost:5173
    start "AttendAI Frontend PWA [Port 5173]" /D "%~dp0frontend" cmd /k "npm run dev"
)

echo.
color 0A
echo ===============================================================================
echo                       AttendAI is running successfully!
echo ===============================================================================
echo.
echo   [Web Endpoints]
echo     - Frontend App:   http://localhost:5173
echo     - Backend API:    http://localhost:4000
echo     - API Health:     http://localhost:4000/api/v1/health
echo.
echo   [1-Click Instant Demo Credentials]
echo     * Student Portal:   student1@attendai.com   / Student@123
echo     * Faculty Portal:   teacher1@attendai.com   / Teacher@123
echo     * Admin / Dean:     admin@attendai.com      / Admin@123
echo.
echo   [Useful Tips]
echo     - To stop all servers cleanly, run stop.bat in the root folder.
echo     - Offline mode: Attendance and rosters are cached in client IndexedDB.
echo ===============================================================================
echo.

ping -n 4 127.0.0.1 >nul
start http://localhost:5173
exit /b 0
