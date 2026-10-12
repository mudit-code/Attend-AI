@echo off
title AttendAI - Stopping Services
echo Stopping AttendAI Docker containers...
docker compose down
echo.
echo All containers stopped.
pause
