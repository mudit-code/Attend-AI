@echo off
title AttendAI - Dedicated Student Portal
color 0A
cls

echo ===============================================================================
echo                AttendAI - Dedicated Student Web & PWA Portal
echo                    Port: 5174 ^| Direct Student Experience
echo ===============================================================================
echo.

cd /d "%~dp0student-app"

if not exist "node_modules" (
    echo [INFO] Installing student-app dependencies...
    call npm install
)

echo [OK] Launching Student Portal at http://localhost:5174...
echo.
call npm run dev -- --port 5174
pause
