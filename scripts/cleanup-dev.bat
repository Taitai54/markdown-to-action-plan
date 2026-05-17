@echo off
REM Stop Next.js dev servers on ports 3000/3001 and remove stale .next dev lock.
setlocal EnableDelayedExpansion

set PORTS=3000 3001
for %%P in (%PORTS%) do (
    for /f "tokens=5" %%A in ('netstat -ano 2^>nul ^| findstr /C:":%%P " ^| findstr LISTENING') do (
        if not "%%A"=="0" (
            echo   Port %%P: stopping PID %%A
            taskkill /PID %%A /F >nul 2>&1
        )
    )
)

if exist "%~dp0..\.next\dev\lock" (
    echo   Removing stale .next\dev\lock
    del /f /q "%~dp0..\.next\dev\lock" >nul 2>&1
)

REM Brief pause so Windows releases the port
ping 127.0.0.1 -n 3 >nul

endlocal
