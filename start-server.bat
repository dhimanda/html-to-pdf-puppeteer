@echo off
REM HTML to PDF Converter - Quick Start
REM This script starts the server for local testing

echo.
echo ========================================
echo  HTML to PDF Converter - Local Server
echo ========================================
echo.

REM Check if node is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Start the server
echo.
echo Starting server...
echo.
echo Server will run on: http://localhost:3000
echo.
echo Opening browser in 3 seconds...
timeout /t 3 /nobreak

REM Open browser
start http://localhost:3000

REM Start the Node server
node server.js

pause
