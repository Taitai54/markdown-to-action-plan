@echo off
title Markdown to Action Plan
cd /d "%~dp0"

echo ============================================
echo   Markdown to Action Plan
echo ============================================
echo.

:: Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies first...
    call npm install
    echo.
)

:: Open browser after a short delay
start "" cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:3000"

echo Starting server on http://localhost:3000
echo Your browser will open automatically.
echo.
echo Keep this window open! Close it to stop the server.
echo ============================================
echo.

call npm run dev

echo.
echo Server stopped.
pause
