@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

set "AGENTS_DIR=%~dp0"
if "%AGENTS_DIR:~-1%"=="\" set "AGENTS_DIR=%AGENTS_DIR:~0,-1%"
cd /d "%AGENTS_DIR%"

echo ========================================
echo ABCD Tools - Starting Agent
echo ========================================
echo.
echo Working directory: %AGENTS_DIR%
echo.

REM ============================================================
REM STEP 1: Check Installation
REM ============================================================
echo [Step 1/2] Checking installation...
echo.

if not exist "%AGENTS_DIR%\script\check.bat" (
    echo [ERROR] check.bat not found!
    echo.
    pause
    exit /b 1
)

REM Call check.bat in silent mode
call "%AGENTS_DIR%\script\check.bat" silent
set "CHECK_RESULT=!errorlevel!"

if !CHECK_RESULT! EQU 0 (
    echo [OK] All checks passed!
    goto :start_agent
)

REM ============================================================
REM Issues Found - Show Details and Ask User
REM ============================================================
echo.
echo ========================================
echo Issues Detected!
echo ========================================
echo.

set "NEED_NODE=0"
set "NEED_PNPM=0"
set "NEED_DEPS=0"
set "NEED_ENV=0"

if not exist "%AGENTS_DIR%\node.exe" (
    echo   [X] Node.js - MISSING
    set "NEED_NODE=1"
) else (
    echo   [OK] Node.js - Found
)

if not exist "%AGENTS_DIR%\pnpm.exe" (
    echo   [X] pnpm - MISSING
    set "NEED_PNPM=1"
) else (
    echo   [OK] pnpm - Found
)

if not exist "%AGENTS_DIR%\node_modules" (
    echo   [X] Dependencies - MISSING
    set "NEED_DEPS=1"
) else (
    echo   [OK] Dependencies - Found
)

if not exist "%AGENTS_DIR%\.env" (
    echo   [X] .env file - MISSING
    set "NEED_ENV=1"
) else (
    findstr /C:"CLIENT_ID=" "%AGENTS_DIR%\.env" >nul 2>&1
    if errorlevel 1 (
        echo   [X] .env file - INCOMPLETE
        set "NEED_ENV=1"
    ) else (
        echo   [OK] .env file - Found
    )
)

echo.
echo ========================================

REM If .env is missing, cannot continue
if %NEED_ENV% EQU 1 (
    echo.
    echo [CRITICAL ERROR]
    echo .env file is missing or incomplete!
    echo.
    echo This file contains your API credentials and must exist.
    echo Please reinstall the agent or restore your .env file.
    echo.
    echo Location: %AGENTS_DIR%\.env
    echo.
    pause
    exit /b 1
)

REM If other components missing, ask to install
set "NEED_INSTALL=0"
if %NEED_NODE% EQU 1 set "NEED_INSTALL=1"
if %NEED_PNPM% EQU 1 set "NEED_INSTALL=1"
if %NEED_DEPS% EQU 1 set "NEED_INSTALL=1"

if %NEED_INSTALL% EQU 1 (
    echo.
    echo Some components are missing.
    echo.
    echo Do you want to install them now?
    echo.
    echo   [Y] Yes - Run setup_agents.bat to install
    echo   [N] No  - Exit and install manually
    echo.
    choice /C YN /N /M "Your choice: "
    
    if errorlevel 2 (
        echo.
        echo Installation cancelled.
        echo Please run setup_agents.bat manually when ready.
        echo.
        pause
        exit /b 1
    )
    
    REM User chose Yes - run setup
    echo.
    echo ========================================
    echo Running Setup
    echo ========================================
    echo.
    
    if not exist "%AGENTS_DIR%\script\setup_agents.bat" (
        echo [ERROR] setup_agents.bat not found!
        echo Location: %AGENTS_DIR%\script\setup_agents.bat
        echo.
        pause
        exit /b 1
    )
    
    call "%AGENTS_DIR%\script\setup_agents.bat"
    set "SETUP_RESULT=!errorlevel!"
    
    if !SETUP_RESULT! NEQ 0 (
        echo.
        echo ========================================
        echo [ERROR] Setup Failed!
        echo ========================================
        echo.
        echo Please check the errors above.
        echo You may need to:
        echo   - Check internet connection
        echo   - Run as administrator
        echo   - Disable antivirus temporarily
        echo.
        pause
        exit /b 1
    )
    
    REM Verify installation successful
    echo.
    echo Verifying installation...
    call "%AGENTS_DIR%\script\check.bat" silent
    
    if errorlevel 1 (
        echo.
        echo ========================================
        echo [WARNING] Some issues remain
        echo ========================================
        echo.
        echo Setup completed but verification failed.
        echo Check: %AGENTS_DIR%\script\error.log
        echo.
        pause
        exit /b 1
    )
    
    echo [OK] Installation verified!
    echo.
)

REM ============================================================
REM STEP 2: Start Agent
REM ============================================================
:start_agent
echo.
echo [Step 2/2] Starting agent...
echo.

REM Final checks before starting
if not exist "%AGENTS_DIR%\node.exe" (
    echo [ERROR] node.exe not found!
    echo Please run setup_agents.bat first.
    echo.
    pause
    exit /b 1
)

if not exist "%AGENTS_DIR%\node_modules" (
    echo [ERROR] node_modules not found!
    echo Please run setup_agents.bat first.
    echo.
    pause
    exit /b 1
)

if not exist "%AGENTS_DIR%\.env" (
    echo [ERROR] .env file not found!
    echo Please reinstall the agent.
    echo.
    pause
    exit /b 1
)

set "AGENT_SCRIPT=%AGENTS_DIR%\modules-client\agent.js"
if not exist "%AGENT_SCRIPT%" (
    echo [ERROR] agent.js not found!
    echo Location: %AGENT_SCRIPT%
    echo.
    echo Please reinstall the agent.
    echo.
    pause
    exit /b 1
)

REM Create logs directory
if not exist "%AGENTS_DIR%\logs" mkdir "%AGENTS_DIR%\logs" 2>nul

echo ========================================
echo Starting ABCD Tools Client Agent
echo ========================================
echo.
echo The agent will now:
echo   - Connect to API server
echo   - Verify registration
echo   - Begin polling for jobs
echo.
echo Log: %AGENTS_DIR%\logs\agent.log
echo.
echo Press Ctrl+C to stop the agent
echo.
echo ========================================
echo.

REM Start the agent
"%AGENTS_DIR%\node.exe" "%AGENT_SCRIPT%" 2>>"%AGENTS_DIR%\logs\agent.log"

set "EXIT_CODE=!errorlevel!"

echo.
echo ========================================
echo Agent Stopped
echo ========================================
echo.

if !EXIT_CODE! NEQ 0 (
    echo Exit code: !EXIT_CODE!
    echo.
    echo Check log for details:
    echo %AGENTS_DIR%\logs\agent.log
    echo.
)

pause
exit /b !EXIT_CODE!