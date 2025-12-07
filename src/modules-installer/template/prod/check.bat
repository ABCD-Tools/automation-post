@echo off
REM ABCD Tools - Check Installation
REM Checks if Node.js, pnpm are installed and client is registered
REM Returns error codes: 0 = all OK, 1 = errors found

setlocal enabledelayedexpansion

REM Enable echo to see all commands (for debugging)
REM @echo on

REM Get the directory where this batch file is located
set "SCRIPT_DIR=%~dp0"
REM Remove trailing backslash
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

REM Change to script directory first to establish working directory
echo [DEBUG] Attempting to change to script directory: %SCRIPT_DIR%
cd /d "%SCRIPT_DIR%" 2>nul
if errorlevel 1 (
    echo.
    echo ========================================
    echo ERROR: Cannot access script directory!
    echo ========================================
    echo.
    echo Script directory: %SCRIPT_DIR%
    echo.
    echo This error occurred before any checks could be performed.
    echo Please verify the installation is complete and try again.
    echo.
    pause
    exit /b 1
)

REM Verify we're in the correct directory
if not exist "%SCRIPT_DIR%" (
    echo.
    echo ========================================
    echo ERROR: Script directory does not exist!
    echo ========================================
    echo.
    echo Script directory: %SCRIPT_DIR%
    echo.
    pause
    exit /b 1
)

REM Check if we're in script/ subdirectory (check.bat is in agents/script/)
REM Look for agents/ root indicators: package.json, modules-client, or start_agent.bat
set "AGENTS_DIR="

if exist "..\package.json" (
    REM We're in script/, go up to agents/ root
    cd /d ".." 2>nul
    if errorlevel 1 (
        echo.
        echo ========================================
        echo ERROR: Cannot navigate to agents directory!
        echo ========================================
        echo.
        echo Failed to change to parent directory from: %SCRIPT_DIR%
        echo.
        pause
        exit /b 1
    )
    set "AGENTS_DIR=%CD%"
) else if exist "..\modules-client" (
    REM We're in script/, go up to agents/ root
    cd /d ".." 2>nul
    if errorlevel 1 (
        echo.
        echo ========================================
        echo ERROR: Cannot navigate to agents directory!
        echo ========================================
        echo.
        echo Failed to change to parent directory from: %SCRIPT_DIR%
        echo.
        pause
        exit /b 1
    )
    set "AGENTS_DIR=%CD%"
) else if exist "..\start_agent.bat" (
    REM We're in script/, go up to agents/ root
    cd /d ".." 2>nul
    if errorlevel 1 (
        echo.
        echo ========================================
        echo ERROR: Cannot navigate to agents directory!
        echo ========================================
        echo.
        echo Failed to change to parent directory from: %SCRIPT_DIR%
        echo.
        pause
        exit /b 1
    )
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
    cd /d "..\agents" 2>nul
    if errorlevel 1 (
        echo.
        echo ========================================
        echo ERROR: Cannot navigate to agents directory!
        echo ========================================
        echo.
        echo Failed to change to ..\agents from: %SCRIPT_DIR%
        echo.
        pause
        exit /b 1
    )
    set "AGENTS_DIR=%CD%"
) else if exist "agents\package.json" (
    REM agents/ is a subdirectory
    cd /d "agents" 2>nul
    if errorlevel 1 (
        echo.
        echo ========================================
        echo ERROR: Cannot navigate to agents directory!
        echo ========================================
        echo.
        echo Failed to change to agents\ subdirectory from: %SCRIPT_DIR%
        echo.
        pause
        exit /b 1
    )
    set "AGENTS_DIR=%CD%"
) else (
    REM Last resort: assume current directory is agents/ root
    set "AGENTS_DIR=%CD%"
    echo.
    echo ========================================
    echo WARNING: Could not detect agents directory structure
    echo ========================================
    echo.
    echo Using current directory as agents root: %AGENTS_DIR%
    echo.
    echo If this is incorrect, please ensure:
    echo   - package.json exists in agents/ root
    echo   - modules-client/ directory exists
    echo   - start_agent.bat exists in agents/ root
    echo.
)

REM Ensure we're in the agents directory
if not defined AGENTS_DIR (
    echo.
    echo ========================================
    echo ERROR: Failed to determine agents directory!
    echo ========================================
    echo.
    echo Script directory: %SCRIPT_DIR%
    echo Current directory: %CD%
    echo.
    echo This is a critical error. Please check the installation.
    echo.
    pause
    exit /b 1
)

cd /d "%AGENTS_DIR%" 2>nul
if errorlevel 1 (
    echo.
    echo ========================================
    echo ERROR: Cannot change to agents directory!
    echo ========================================
    echo.
    echo Agents directory: %AGENTS_DIR%
    echo.
    echo This directory may not exist or may be inaccessible.
    echo.
    pause
    exit /b 1
)

REM Verify agents directory exists and is accessible
if not exist "%AGENTS_DIR%" (
    echo.
    echo ========================================
    echo ERROR: Agents directory does not exist!
    echo ========================================
    echo.
    echo Agents directory: %AGENTS_DIR%
    echo.
    pause
    exit /b 1
)

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
        echo     The file exists but cannot execute. It may be corrupted.
        set /a ERRORS+=1
        set "ERROR_NODE=1"
    ) else (
        for /f "tokens=*" %%i in ('"%NODE_EXE%" --version 2^>nul') do set NODE_VERSION=%%i
        if defined NODE_VERSION (
            echo   ✓ Node.js version: !NODE_VERSION!
        ) else (
            echo   ⚠ Node.js found but version check failed
            set /a ERRORS+=1
            set "ERROR_NODE=1"
        )
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
        echo     The file exists but cannot execute. It may be corrupted.
        set /a ERRORS+=1
        set "ERROR_PNPM=1"
    ) else (
        for /f "tokens=*" %%i in ('"%PNPM_EXE%" --version 2^>nul') do set PNPM_VERSION=%%i
        if defined PNPM_VERSION (
            echo   ✓ pnpm version: !PNPM_VERSION!
        ) else (
            echo   ⚠ pnpm found but version check failed
            set /a ERRORS+=1
            set "ERROR_PNPM=1"
        )
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
        echo     The .env file exists but is missing CLIENT_ID
        set /a ERRORS+=1
        set "ERROR_ENV=1"
    ) else (
        echo   ✓ CLIENT_ID found
    )
    
    findstr /C:"API_TOKEN=" "%ENV_FILE%" >nul 2>&1
    if errorlevel 1 (
        echo   ✗ API_TOKEN not found in .env
        echo     The .env file exists but is missing API_TOKEN
        set /a ERRORS+=1
        set "ERROR_ENV=1"
    ) else (
        echo   ✓ API_TOKEN found
    )
    
    findstr /C:"ENCRYPTION_KEY=" "%ENV_FILE%" >nul 2>&1
    if errorlevel 1 (
        echo   ✗ ENCRYPTION_KEY not found in .env
        echo     The .env file exists but is missing ENCRYPTION_KEY
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
