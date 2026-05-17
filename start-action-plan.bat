@echo off
title Markdown to Action Plan
cd /d "%~dp0"

echo ============================================
echo   Markdown to Action Plan
echo ============================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not on PATH.
    echo Install Node.js 18+ from https://nodejs.org/ then run this file again.
    echo.
    pause
    exit /b 1
)

echo Preparing dev server (freeing port 3000 if needed)...
call "%~dp0scripts\cleanup-dev.bat"
echo.

if not exist ".env.local" (
    echo WARNING: .env.local not found.
    if exist ".env.local.example" (
        echo Copy .env.local.example to .env.local and add at least one API key.
        echo   copy .env.local.example .env.local
    ) else (
        echo Create .env.local with your API keys before generating plans.
    )
    echo.
) else (
    setlocal EnableDelayedExpansion
    echo Checking provider configuration from .env.local...
    set OPENAI_OK=0
    set PERPLEXITY_OK=0
    set GEMINI_OK=0
    set OPENROUTER_OK=0

    for /f "usebackq tokens=1* delims==" %%A in (".env.local") do (
        if /i "%%A"=="OPENAI_API_KEY" if not "%%B"=="" set OPENAI_OK=1
        if /i "%%A"=="PERPLEXITY_API_KEY" if not "%%B"=="" set PERPLEXITY_OK=1
        if /i "%%A"=="GEMINI_API_KEY" if not "%%B"=="" set GEMINI_OK=1
        if /i "%%A"=="OPENROUTER_API_KEY" if not "%%B"=="" set OPENROUTER_OK=1
    )

    echo   OPENAI_API_KEY:      !OPENAI_OK!
    echo   PERPLEXITY_API_KEY:  !PERPLEXITY_OK!
    echo   GEMINI_API_KEY:      !GEMINI_OK!
    echo   OPENROUTER_API_KEY:  !OPENROUTER_OK!
    echo.

    set /a CONFIGURED=!OPENAI_OK!+!PERPLEXITY_OK!+!GEMINI_OK!+!OPENROUTER_OK!
    if !CONFIGURED!==0 (
        echo WARNING: No API keys detected in .env.local.
        echo Add at least one provider key, then restart this launcher.
        echo.
    )
    endlocal
)

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo npm install failed.
        pause
        exit /b 1
    )
    echo.
)

echo Starting server on http://localhost:3000
echo (webpack dev mode - reliable on Windows)
echo.
echo Keep this window open. Close it to stop the server.
echo Browser opens once the server is ready.
echo To stop a stuck server later, run stop-action-plan.bat
echo ============================================
echo.

start "" cmd /c "timeout /t 10 /nobreak >nul && start http://localhost:3000"

call npm run dev
set EXIT_CODE=%ERRORLEVEL%

echo.
if %EXIT_CODE% neq 0 (
    echo Server exited with an error ^(code %EXIT_CODE%^).
    echo.
    echo Try: stop-action-plan.bat   then run this file again.
    echo Or:  rmdir /s /q .next     then run this file again.
) else (
    echo Server stopped.
)
pause
exit /b %EXIT_CODE%
