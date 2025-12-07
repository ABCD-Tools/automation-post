@echo off
REM ABCD Tools - Start Agent
REM Starts the agent with proper checks and auto-fix

setlocal enabledelayedexpansion

REM Get the directory where this batch file is located
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM Check if we're in agents/ subdirectory, if so go up one level
if exist "%SCRIPT_DIR%..\agents" (
    set "ROOT_DIR=%SCRIPT_DIR%.."
    cd /d "%ROOT_DIR%"
) else (
    set "ROOT_DIR=%SCRIPT_DIR%"
)

REM Check if we're in the agents folder itself
if exist "%ROOT_DIR%\agents" (
    set "AGENTS_DIR=%ROOT_DIR%\agents"
) else if "%ROOT_DIR:~-7%"=="\agents" (
    set "AGENTS_DIR=%ROOT_DIR%"
) else (
    set "AGENTS_DIR=%ROOT_DIR%"
)

cd /d "%AGENTS_DIR%"

echo ========================================
echo ABCD Tools - Starting Agent
echo ========================================
echo.
echo Working directory: %AGENTS_DIR%
echo.

REM Step 1: Run check.bat (first check, checkCount = 1)
echo [Step 1/6] Running initial installation check...
echo.
REM check.bat is in script/ subdirectory
if exist "%AGENTS_DIR%\script\check.bat" (
    call "%AGENTS_DIR%\script\check.bat"
) else if exist "%AGENTS_DIR%\check.bat" (
    call "%AGENTS_DIR%\check.bat"
) else (
    echo ERROR: check.bat not found!
    pause
    exit /b 1
)
set "CHECK_RESULT=%errorlevel%"
set "CHECK_COUNT=1"

if %CHECK_RESULT% EQU 0 (
    echo.
    echo ✓ All checks passed on first attempt!
    goto :start_agent
)

REM Step 2: List all errors and fix them procedurally
echo.
echo [Step 2/6] Analyzing errors and fixing them...
echo.

REM Check what needs to be fixed
set "NEED_NODE=0"
set "NEED_PNPM=0"
set "NEED_NODE_MODULES=0"
set "NEED_ENV=0"

if not exist "%AGENTS_DIR%\node.exe" (
    set "NEED_NODE=1"
    echo   [FIX] Node.js (portable) missing - will install
)

if not exist "%AGENTS_DIR%\pnpm.exe" (
    set "NEED_PNPM=1"
    echo   [FIX] pnpm (portable) missing - will install
)

if not exist "%AGENTS_DIR%\node_modules" (
    set "NEED_NODE_MODULES=1"
    echo   [FIX] node_modules missing - will install
)

if not exist "%AGENTS_DIR%\.env" (
    set "NEED_ENV=1"
    echo   [FIX] .env file missing - cannot auto-fix, please reinstall
)

REM Step 3: Fix errors procedurally
echo.
echo [Step 3/6] Fixing errors...
echo.

REM Fix 1: Install Node.js and pnpm if needed
set "SETUP_SCRIPT="
if exist "%AGENTS_DIR%\script\setup_agents.bat" (
    set "SETUP_SCRIPT=%AGENTS_DIR%\script\setup_agents.bat"
) else if exist "%AGENTS_DIR%\setup_agents.bat" (
    set "SETUP_SCRIPT=%AGENTS_DIR%\setup_agents.bat"
) else (
    echo   ✗ ERROR: setup_agents.bat not found!
    pause
    exit /b 1
)

if !NEED_NODE! EQU 1 if !NEED_PNPM! EQU 1 (
    echo   Installing Node.js and pnpm...
    call "!SETUP_SCRIPT!"
    if errorlevel 1 (
        echo   ✗ Failed to install Node.js and pnpm
        echo   Please run setup_agents.bat manually
        pause
        exit /b 1
    )
) else if !NEED_NODE! EQU 1 (
    echo   Installing Node.js...
    REM Run setup_agents.bat which will skip pnpm if it exists
    call "!SETUP_SCRIPT!"
    if errorlevel 1 (
        echo   ✗ Failed to install Node.js
        pause
        exit /b 1
    )
) else if !NEED_PNPM! EQU 1 (
    echo   Installing pnpm...
    REM Run setup_agents.bat which will skip Node.js if it exists
    call "!SETUP_SCRIPT!"
    if errorlevel 1 (
        echo   ✗ Failed to install pnpm
        pause
        exit /b 1
    )
)

REM Fix 2: Install node_modules if needed
if !NEED_NODE_MODULES! EQU 1 (
    echo   Installing dependencies...
    if defined SETUP_SCRIPT (
        REM setup_agents.bat already installs dependencies
        call "!SETUP_SCRIPT!"
    ) else (
        REM Fallback: try to run pnpm install directly
        if exist "%AGENTS_DIR%\pnpm.exe" (
            cd /d "%AGENTS_DIR%"
            set "PNPM_NODE_PATH=%AGENTS_DIR%\node.exe"
            "%AGENTS_DIR%\pnpm.exe" install
            if errorlevel 1 (
                echo   ✗ Failed to install dependencies
                pause
                exit /b 1
            )
        ) else (
            echo   ✗ Cannot install dependencies - pnpm not found
            pause
            exit /b 1
        )
    )
    if errorlevel 1 (
        echo   ✗ Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Fix 3: .env file - cannot auto-fix, must be present
if !NEED_ENV! EQU 1 (
    echo.
    echo   ✗ ERROR: .env file is missing!
    echo   This file should have been created during installation.
    echo   Please reinstall the agent.
    pause
    exit /b 1
)

REM Step 4: Recheck (checkCount = 2, max = 2)
echo.
echo [Step 4/6] Rechecking installation (checkCount = 2)...
echo.
set /a CHECK_COUNT+=1
if exist "%AGENTS_DIR%\script\check.bat" (
    call "%AGENTS_DIR%\script\check.bat"
) else if exist "%AGENTS_DIR%\check.bat" (
    call "%AGENTS_DIR%\check.bat"
) else (
    echo ERROR: check.bat not found!
    pause
    exit /b 1
)
set "CHECK_RESULT=%errorlevel%"

if %CHECK_RESULT% NEQ 0 (
    echo.
    echo ✗ Some issues still remain after fixing attempts
    echo Please check the errors above and fix them manually
    pause
    exit /b 1
)

echo.
echo ✓ All checks passed after fixes!

REM Step 5: Verify client registration
echo.
echo [Step 5/6] Verifying client registration...
if exist "%AGENTS_DIR%\.env" (
    echo   ✓ .env file found
    REM Registration will be verified when agent starts
    echo   ℹ  Registration will be verified when agent starts
) else (
    echo   ✗ .env file not found!
    echo     This file should have been created during installation.
    echo     Please reinstall the agent.
    pause
    exit /b 1
)

REM Step 6: Start the agent
:start_agent
echo.
echo [Step 6/6] Starting agent...
echo.

REM Path to Node.js binary
set "NODE_EXE=%AGENTS_DIR%\node.exe"

REM Check if node.exe exists
if not exist "%NODE_EXE%" (
    echo ERROR: node.exe not found!
    echo Please run setup_agents.bat first.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "%AGENTS_DIR%\node_modules" (
    echo.
    echo ERROR: node_modules not found!
    echo Please run setup_agents.bat first to install dependencies.
    echo.
    pause
    exit /b 1
)

REM Agent script path (should be in modules-client/agent.js)
set "AGENT_SCRIPT=%AGENTS_DIR%\modules-client\agent.js"

if not exist "%AGENT_SCRIPT%" (
    echo ERROR: agent.js not found!
    echo Expected location: %AGENT_SCRIPT%
    pause
    exit /b 1
)

REM Create logs directory if it doesn't exist
if not exist "%AGENTS_DIR%\logs" (
    mkdir "%AGENTS_DIR%\logs"
)

echo Starting ABCD Tools Client...
echo Using Node.js: %NODE_EXE%
echo Agent script: %AGENT_SCRIPT%
echo Logs directory: %AGENTS_DIR%\logs
echo.

REM Start the agent (redirect stderr to logs/agent.log)
cd /d "%AGENTS_DIR%"
"%NODE_EXE%" "%AGENT_SCRIPT%" 2>>"%AGENTS_DIR%\logs\agent.log"

set "EXIT_CODE=%errorlevel%"

if %EXIT_CODE% NEQ 0 (
    echo.
    echo Agent exited with error code: %EXIT_CODE%
    echo Check logs\agent.log for details.
    pause
)

exit /b %EXIT_CODE%

