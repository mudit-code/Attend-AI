@echo off
title AttendAI - Initial Project Setup
echo ===================================================
echo           AttendAI - Initial Setup & Seed
echo ===================================================
echo.

:: 1. Start Docker
echo [1/5] Starting PostgreSQL and Redis containers...
docker compose up -d
if %errorlevel% neq 0 (
    echo [WARNING] Docker Compose failed. Please ensure Docker Desktop is running.
)
echo.

:: 2. Wait for Postgres
echo [2/5] Waiting 5 seconds for PostgreSQL to be ready...
timeout /t 5 >nul
echo.

:: 3. Backend: Prisma Generate & Migrate
echo [3/5] Setting up database schema with Prisma...
cd /d "%~dp0backend"
call npx prisma generate
call npx prisma migrate dev --name init
echo.

:: 4. Seed Database
echo [4/5] Seeding database with Admin, Teachers, Students, and Timetable...
call npm run db:seed
echo.

:: 5. Finished
cd /d "%~dp0"
echo ===================================================
echo   Setup completed successfully!
echo   Double-click "start-dev.bat" to launch the app!
echo ===================================================
echo.
pause
