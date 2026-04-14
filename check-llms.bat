@echo off
title LLM Provider Smoke Check
cd /d "%~dp0"

echo ============================================
echo   LLM Provider Smoke Check
echo ============================================
echo.

call npm run check:llms

echo.
if errorlevel 1 (
    echo One or more provider checks failed.
) else (
    echo All configured providers responded successfully.
)
pause
