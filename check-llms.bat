@echo off
title LLM Provider Smoke Check
cd /d "%~dp0"

echo ============================================
echo   LLM Provider Smoke Check
echo ============================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not on PATH.
    pause
    exit /b 1
)

if not exist ".env.local" (
    echo ERROR: .env.local not found. Copy .env.local.example and add API keys.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

call npm run check:llms

echo.
if errorlevel 1 (
    echo One or more provider checks failed.
) else (
    echo All configured providers responded successfully.
)
pause
