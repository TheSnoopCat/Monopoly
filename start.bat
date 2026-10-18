@echo off
title Estate Empire
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Opening the download page...
  echo Install the LTS version, then double-click start.bat again.
  start https://nodejs.org/en/download
  pause
  exit /b
)
start "" http://localhost:3000
node server.js
pause
