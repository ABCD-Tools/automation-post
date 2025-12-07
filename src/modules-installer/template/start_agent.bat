@echo off
REM ABCD Tools - Start Agent
REM Starts the agent with proper checks

setlocal enabledelayedexpansion

REM Get the directory where this batch file is located
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo ========================================
echo ABCD Tools - Starting Agent
echo ========================================
echo.

REM Step 1: Run check.bat
echo [Step 1/4] Running installation check...
call "%SCRIPT_DIR%check.bat"
if errorlevel 1 (
    echo.
    echo ERROR: Installation check failed!
    echo Please fix the issues and try again.
    pause
    exit /b 1
)

echo.
echo [Step 2/4] Checking if setup is needed...

REM Check if node.exe exists
if not exist "%SCRIPT_DIR%node.exe" (
    echo   Node.js not found. Running setup...
    call "%SCRIPT_DIR%setup_agents.bat"
    if errorlevel 1 (
        echo.
        echo ERROR: Setup failed!
        pause
        exit /b 1
    )
) else (
    echo   ✓ Node.js found
)

REM Check if node_modules exists
if not exist "%SCRIPT_DIR%node_modules" (
    echo   Dependencies not found. Running setup...
    call "%SCRIPT_DIR%setup_agents.bat"
    if errorlevel 1 (
        echo.
        echo ERROR: Setup failed!
        pause
        exit /b 1
    )
) else (
    echo   ✓ Dependencies found
)

echo.
echo [Step 3/4] Checking client registration...

REM Check if .env exists
if not exist "%SCRIPT_DIR%.env" (
    echo   ✗ .env file not found!
    echo     This file should have been created during installation.
    echo     Please reinstall the agent.
    pause
    exit /b 1
)

REM Try to ping API to check registration (if Node.js is available)
if exist "%SCRIPT_DIR%node.exe" if exist "%SCRIPT_DIR%node_modules" (
    echo   Attempting to check registration status...
    REM Note: Actual registration check happens in agent.js
    echo   ℹ  Registration will be verified when agent starts
) else (
    echo   ⚠  Cannot check registration - Node.js or dependencies missing
)

echo.
echo [Step 4/4] Starting agent...
echo.

REM Path to Node.js binary
set "NODE_EXE=%SCRIPT_DIR%node.exe"

REM Check if node.exe exists
if not exist "%NODE_EXE%" (
    echo ERROR: node.exe not found!
    echo Please run setup_agents.bat first.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "%SCRIPT_DIR%node_modules" (
    echo.
    echo ERROR: node_modules not found!
    echo Please run setup_agents.bat first to install dependencies.
    echo.
    pause
    exit /b 1
)

REM Agent script path (should be in modules-client/agent.js)
set "AGENT_SCRIPT=%SCRIPT_DIR%modules-client\agent.js"

if not exist "%AGENT_SCRIPT%" (
    echo ERROR: agent.js not found!
    echo Expected location: %AGENT_SCRIPT%
    pause
    exit /b 1
)

REM Create logs directory if it doesn't exist
if not exist "%SCRIPT_DIR%logs" (
    mkdir "%SCRIPT_DIR%logs"
)

echo Starting ABCD Tools Client...
echo Using Node.js: %NODE_EXE%
echo Agent script: %AGENT_SCRIPT%
echo Logs directory: %SCRIPT_DIR%logs
echo.

REM Start the agent (redirect stderr to logs/agent.log)
"%NODE_EXE%" "%AGENT_SCRIPT%" 2>>"%SCRIPT_DIR%logs\agent.log"

set "EXIT_CODE=%errorlevel%"

if %EXIT_CODE% NEQ 0 (
    echo.
    echo Agent exited with error code: %EXIT_CODE%
    echo Check logs\agent.log for details.
    pause
)

exit /b %EXIT_CODE%

