@echo off
title Markdown to Action Plan
cd /d "%~dp0"

echo ============================================
echo   Markdown to Action Plan
echo ============================================
echo.

echo Checking provider configuration from .env.local...
set OPENAI_OK=0
set PERPLEXITY_OK=0
set GEMINI_OK=0
set OPENROUTER_OK=0

if exist ".env.local" (
    for /f "usebackq tokens=1* delims==" %%A in (".env.local") do (
        if /i "%%A"=="OPENAI_API_KEY" if not "%%B"=="" set OPENAI_OK=1
        if /i "%%A"=="PERPLEXITY_API_KEY" if not "%%B"=="" set PERPLEXITY_OK=1
        if /i "%%A"=="GEMINI_API_KEY" if not "%%B"=="" set GEMINI_OK=1
        if /i "%%A"=="OPENROUTER_API_KEY" if not "%%B"=="" set OPENROUTER_OK=1
    )
)

echo   OPENAI_API_KEY:      %OPENAI_OK%
echo   PERPLEXITY_API_KEY:  %PERPLEXITY_OK%
echo   GEMINI_API_KEY:      %GEMINI_OK%
echo   OPENROUTER_API_KEY:  %OPENROUTER_OK%
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
