@echo off
setlocal
title LPRMS stop
cd /d "%~dp0"

echo Stopping LPRMS dev stack...

rem --- kill the launcher windows and their process trees ---
taskkill /FI "WINDOWTITLE eq LPRMS API*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq LPRMS Web*" /T /F >nul 2>&1

rem --- free the ports in case anything is still listening ---
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3093 " ^| findstr LISTENING') do taskkill /PID %%p /T /F >nul 2>&1
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":5103 " ^| findstr LISTENING') do taskkill /PID %%p /T /F >nul 2>&1

echo LPRMS stopped (PostgreSQL was left running).
endlocal
