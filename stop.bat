@echo off
title AttendAI - Clean Shutdown Utility
color 0E
cls

echo ===============================================================================
echo                AttendAI - Shutdown Utility
echo ===============================================================================
echo.
echo Stopping Node.js dev server processes on ports 4000 and 5173...

:: Find and terminate processes listening on port 4000 (Backend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4000" ^| findstr "LISTENING"') do (
    echo [INFO] Stopping process on port 4000 (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

:: Find and terminate processes listening on port 5173 (Frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    echo [INFO] Stopping process on port 5173 (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

:: Ask if user wants to stop Docker containers
echo.
where docker >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Stopping Docker Compose containers (PostgreSQL ^& Redis)...
    docker compose down >nul 2>&1
    echo [OK] Docker containers stopped.
)

echo.
color 0A
echo ===============================================================================
echo            AttendAI servers and containers have been stopped.
echo ===============================================================================
echo.
pause
exit
