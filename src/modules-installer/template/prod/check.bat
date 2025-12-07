@echo off
REM ABCD Tools - Check Installation
REM Checks if Node.js, pnpm are installed and client is registered
REM Returns error codes: 0 = all OK, 1 = errors found

setlocal enabledelayedexpansion

REM Get the directory where this batch file is located
set "SCRIPT_DIR=%~dp0"
REM Remove trailing backslash
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

REM Change to script directory first to establish working directory
cd /d "%SCRIPT_DIR%" 2>nul
if errorlevel 1 (
    echo ERROR: Cannot access script directory: %SCRIPT_DIR%
    pause
    exit /b 1
)

REM Check if we're in script/ subdirectory (check.bat is in agents/script/)
REM Look for agents/ root indicators: package.json, modules-client, or start_agent.bat
if exist "..\package.json" (
    REM We're in script/, go up to agents/ root
    cd /d ".."
    set "AGENTS_DIR=%CD%"
) else if exist "..\modules-client" (
    REM We're in script/, go up to agents/ root
    cd /d ".."
    set "AGENTS_DIR=%CD%"
) else if exist "..\start_agent.bat" (
    REM We're in script/, go up to agents/ root
    cd /d ".."
    set "AGENTS_DIR=%CD%"
) else if exist "package.json" (
    REM We're already in agents/ root
    set "AGENTS_DIR=%CD%"
) else if exist "modules-client" (
    REM We're already in agents/ root
    set "AGENTS_DIR=%CD%"
) else if exist "start_agent.bat" (
    REM We're already in agents/ root
    set "AGENTS_DIR=%CD%"
) else if exist "..\agents\package.json" (
    REM We're outside agents/, navigate to agents/
    cd /d "..\agents"
    set "AGENTS_DIR=%CD%"
) else if exist "agents\package.json" (
    REM agents/ is a subdirectory
    cd /d "agents"
    set "AGENTS_DIR=%CD%"
) else (
    REM Last resort: assume current directory is agents/ root
    set "AGENTS_DIR=%CD%"
)

REM Ensure we're in the agents directory
cd /d "%AGENTS_DIR%"

set "NODE_EXE=%AGENTS_DIR%\node.exe"
set "PNPM_EXE=%AGENTS_DIR%\pnpm.exe"
set "ENV_FILE=%AGENTS_DIR%\.env"
set "ERRORS=0"
set "ERROR_NODE=0"
set "ERROR_PNPM=0"
set "ERROR_NODE_MODULES=0"
set "ERROR_ENV=0"
set "ERROR_REGISTRATION=0"

echo ========================================
echo ABCD Tools - Installation Check
echo ========================================
echo.
echo Checking directory: %AGENTS_DIR%
echo.

REM Check Node.js
echo [1/4] Checking Node.js...
if exist "%NODE_EXE%" (
    echo   ✓ Node.js found: %NODE_EXE%
    "%NODE_EXE%" --version >nul 2>&1
    if errorlevel 1 (
        echo   ✗ Node.js found but not working
        set /a ERRORS+=1
        set "ERROR_NODE=1"
    ) else (
        for /f "tokens=*" %%i in ('"%NODE_EXE%" --version') do set NODE_VERSION=%%i
        echo   ✓ Node.js version: !NODE_VERSION!
    )
) else (
    echo   ✗ Node.js not found
    echo     Expected location: %NODE_EXE%
    set /a ERRORS+=1
    set "ERROR_NODE=1"
)

REM Check pnpm
echo.
echo [2/4] Checking pnpm...
if exist "%PNPM_EXE%" (
    echo   ✓ pnpm found: %PNPM_EXE%
    "%PNPM_EXE%" --version >nul 2>&1
    if errorlevel 1 (
        echo   ✗ pnpm found but not working
        set /a ERRORS+=1
        set "ERROR_PNPM=1"
    ) else (
        for /f "tokens=*" %%i in ('"%PNPM_EXE%" --version') do set PNPM_VERSION=%%i
        echo   ✓ pnpm version: !PNPM_VERSION!
    )
) else (
    echo   ✗ pnpm not found
    echo     Expected location: %PNPM_EXE%
    set /a ERRORS+=1
    set "ERROR_PNPM=1"
)

REM Check node_modules
echo.
echo [3/4] Checking dependencies...
if exist "%AGENTS_DIR%\node_modules" (
    echo   ✓ node_modules found
) else (
    echo   ✗ node_modules not found
    echo     Expected location: %AGENTS_DIR%\node_modules
    set /a ERRORS+=1
    set "ERROR_NODE_MODULES=1"
)

REM Check .env file and registration
echo.
echo [4/4] Checking configuration...
if exist "%ENV_FILE%" (
    echo   ✓ .env file found
    
    REM Check for required variables
    findstr /C:"CLIENT_ID=" "%ENV_FILE%" >nul 2>&1
    if errorlevel 1 (
        echo   ✗ CLIENT_ID not found in .env
        set /a ERRORS+=1
        set "ERROR_ENV=1"
    ) else (
        echo   ✓ CLIENT_ID found
    )
    
    findstr /C:"API_TOKEN=" "%ENV_FILE%" >nul 2>&1
    if errorlevel 1 (
        echo   ✗ API_TOKEN not found in .env
        set /a ERRORS+=1
        set "ERROR_ENV=1"
    ) else (
        echo   ✓ API_TOKEN found
    )
    
    findstr /C:"ENCRYPTION_KEY=" "%ENV_FILE%" >nul 2>&1
    if errorlevel 1 (
        echo   ✗ ENCRYPTION_KEY not found in .env
        set /a ERRORS+=1
        set "ERROR_ENV=1"
    ) else (
        echo   ✓ ENCRYPTION_KEY found
    )
    
    REM Try to check registration status if Node.js is available
    if exist "%NODE_EXE%" if exist "%AGENTS_DIR%\node_modules" (
        echo.
        echo   Checking registration status...
        REM Note: Actual registration check happens in agent.js
        echo   ℹ  Registration status will be checked when agent starts
    )
) else (
    echo   ✗ .env file not found
    echo     Expected location: %ENV_FILE%
    echo     This file should have been created during installation
    set /a ERRORS+=1
    set "ERROR_ENV=1"
)

echo.
echo ========================================
if %ERRORS% EQU 0 (
    echo ✓ All checks passed!
    echo.
    exit /b 0
) else (
    echo ✗ Found %ERRORS% issue(s)
    echo.
    echo Error Summary:
    if !ERROR_NODE! EQU 1 echo   - Node.js (portable) missing or not working
    if !ERROR_PNPM! EQU 1 echo   - pnpm (portable) missing or not working
    if !ERROR_NODE_MODULES! EQU 1 echo   - node_modules missing
    if !ERROR_ENV! EQU 1 echo   - .env file missing or incomplete
    echo.
    echo These errors will be fixed automatically.
    echo ========================================
    echo.
    exit /b 1
)
