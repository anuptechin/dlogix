@echo off
setlocal
title LPRMS launcher
cd /d "%~dp0"

echo ============================================
echo   LPRMS - starting dev stack
echo   Web  http://localhost:5103
echo   API  http://localhost:3093/health
echo ============================================
echo.

rem --- corporate proxy: trust the Windows certificate store ---
set NODE_OPTIONS=--use-system-ca

rem --- free the ports first, so a re-run always starts clean ---
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3093 " ^| findstr LISTENING') do taskkill /PID %%p /T /F >nul 2>&1
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":5103 " ^| findstr LISTENING') do taskkill /PID %%p /T /F >nul 2>&1

rem --- warn if Postgres is not reachable on 5432 ---
netstat -ano | findstr ":5432 " | findstr LISTENING >nul 2>&1
if errorlevel 1 (
  echo [warning] PostgreSQL does not appear to be listening on 5432.
  echo           Start the PostgreSQL 16 service, then re-run this script.
  echo.
)

rem --- launch API and Web in their own minimized windows ---
start "LPRMS API" /min cmd /c "set NODE_OPTIONS=--use-system-ca&& npm run dev -w @lprms/api"
start "LPRMS Web" /min cmd /c "npm run dev -w @lprms/web"

echo Servers launching in minimized windows (LPRMS API / LPRMS Web).
echo Opening the app in your browser shortly...
timeout /t 7 /nobreak >nul
start "" http://localhost:5103

echo.
echo Done. Use stop.cmd to shut everything down.
endlocal
