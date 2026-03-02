@echo off
echo Creating desktop shortcut for Markdown to Action Plan...
powershell -ExecutionPolicy Bypass -File "%~dp0create-shortcut.ps1"
echo.
echo Done! Check your desktop.
pause
