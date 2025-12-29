@echo off
title Argus Trading System
cd /d "C:\Users\tolga\.gemini\antigravity\scratch\ArgusWeb"

echo.
echo  ╔═══════════════════════════════════════════════════╗
echo  ║     ARGUS - AI Trading System                     ║
echo  ║     Installing dependencies...                    ║
echo  ╚═══════════════════════════════════════════════════╝
echo.

:: Install proxy server dependencies if needed
if not exist "node_modules\express" (
    echo Installing express and cors...
    npm install express cors
)

echo.
echo  ╔═══════════════════════════════════════════════════╗
echo  ║     Starting Proxy Server (Port 3001)             ║
echo  ║     Starting Vite Dev Server (Port 5173)          ║
echo  ╚═══════════════════════════════════════════════════╝
echo.

:: Start proxy server in background
start /b node server.cjs

:: Wait for proxy to start
timeout /t 2 /nobreak > nul

:: Open browser
start http://localhost:5173

:: Start Vite dev server
npm run dev
