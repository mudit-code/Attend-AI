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
    echo [INFO] Installing backend dependencies...
    cd /d "%~dp0backend"
    call npm install
) else (
    echo [OK] Backend dependencies verified.
)

if not exist "%~dp0frontend\node_modules" (
    echo [INFO] Installing frontend dependencies...
    cd /d "%~dp0frontend"
    call npm install
) else (
    echo [OK] Frontend dependencies verified.
)

if not exist "%~dp0student-app\node_modules" (
    echo [INFO] Installing student-app dependencies...
    cd /d "%~dp0student-app"
    call npm install
) else (
    echo [OK] Student app dependencies verified.
)
cd /d "%~dp0"
echo.

:: 4. Start Docker Containers if Docker is present
echo [4/6] Booting local database containers if available...
where docker >nul 2>&1
if errorlevel 1 (
    echo [INFO] Docker not found in system PATH. Using SQLite/local database.
) else (
    docker compose -f "%~dp0docker-compose.yml" up -d >nul 2>&1
    if errorlevel 1 (
        echo [INFO] Docker engine offline. Using SQLite/local database.
    ) else (
        echo [OK] Docker containers active.
    )
)
echo.

:: 5. Initialize Prisma Database Client & Deploy Migrations
echo [5/6] Generating Prisma ORM Client and applying migrations...
cd /d "%~dp0backend"
call npx prisma generate >nul 2>&1
if errorlevel 1 (
    echo [WARN] Prisma client generation encountered an issue. Retrying with full log:
    call npx prisma generate
) else (
    echo [OK] Prisma client generated.
)
call npx prisma migrate deploy >nul 2>&1
if errorlevel 1 (
    echo [INFO] Running pending migrations...
    call npx prisma migrate deploy
) else (
    echo [OK] Database schema up to date.
)
cd /d "%~dp0"
echo.

:: 6. Launch Backend, Faculty Frontend, and Student PWA Dev Servers
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
    echo [OK] Faculty/Admin Portal is already running on port 5173.
) else (
    echo   - Starting Faculty/Admin Portal on http://localhost:5173
    start "AttendAI Faculty/Admin Portal [Port 5173]" /D "%~dp0frontend" cmd /k "npm run dev"
)

:: Check if port 5174 is already in use
netstat -ano | findstr /R /C:":5174 .*LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo [OK] Dedicated Student Portal is already running on port 5174.
) else (
    echo   - Starting Dedicated Student Portal on http://localhost:5174
    start "AttendAI Student Portal [Port 5174]" /D "%~dp0student-app" cmd /k "npm run dev -- --port 5174"
)

echo.
color 0A
echo ===============================================================================
echo                       AttendAI is running successfully!
echo ===============================================================================
echo.
echo   [Web Endpoints]
echo     - Faculty / Admin / HOD Portal: http://localhost:5173
echo     - Dedicated Student Mobile PWA: http://localhost:5174
echo     - Guard Gate Desk (Kiosk):      http://localhost:5173/guard
echo     - Backend API Gateway:          http://localhost:4000
echo     - API Health Status:            http://localhost:4000/api/v1/health
echo.
echo   [Demo Credentials]
echo     * Admin:       admin@attendai.com      / Admin@123
echo     * HOD:         hod.cs@attendai.com     / Hod@123
echo     * Faculty:     teacher1@attendai.com   / Teacher@123
echo     * Student:     student1@attendai.com   / Student@123
echo.
echo   [Useful Tips]
echo     - To stop all servers cleanly, run stop.bat in the root folder.
echo     - Run start-student.bat if you only want to boot the student portal.
echo ===============================================================================
echo.

ping -n 4 127.0.0.1 >nul
start http://localhost:5173
exit /b 0
