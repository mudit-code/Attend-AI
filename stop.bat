@echo off
title AttendAI - Clean Shutdown Utility
color 0E
cls

echo ===============================================================================
echo                AttendAI - Shutdown Utility
echo ===============================================================================
echo.
echo Stopping Node.js dev server processes on ports 4000 and 5173...

:: Find and terminate processes listening on port 4000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4000" ^| findstr "LISTENING"') do (
    echo [INFO] Stopping process on port 4000 [PID: %%a]...
    taskkill /F /PID %%a >nul 2>&1
)

:: Find and terminate processes listening on port 5173
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    echo [INFO] Stopping process on port 5173 [PID: %%a]...
    taskkill /F /PID %%a >nul 2>&1
)

:: Stop Docker containers if available
echo.
where docker >nul 2>&1
if not errorlevel 1 (
    echo [INFO] Stopping Docker Compose containers - PostgreSQL ^& Redis...
    docker compose -f "%~dp0docker-compose.yml" down >nul 2>&1
    echo [OK] Docker containers stopped.
)

echo.
color 0A
echo ===============================================================================
echo            AttendAI servers and containers have been stopped.
echo ===============================================================================
echo.
pause
exit /b 0
