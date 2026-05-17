@echo off
title Stop Markdown to Action Plan
cd /d "%~dp0"

echo Stopping any dev server for this project...
echo.

call "%~dp0scripts\cleanup-dev.bat"

echo.
echo Done. You can run run.bat or start-action-plan.bat again.
pause
