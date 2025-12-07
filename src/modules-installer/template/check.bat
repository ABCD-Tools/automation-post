@echo off
REM ABCD Tools - Check Installation
REM Checks if Node.js, pnpm are installed and client is registered

setlocal enabledelayedexpansion

echo ========================================
echo ABCD Tools - Installation Check
echo ========================================
echo.

REM Get the directory where this batch file is located
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

set "NODE_EXE=%SCRIPT_DIR%node.exe"
set "PNPM_EXE=%SCRIPT_DIR%pnpm.exe"
set "ENV_FILE=%SCRIPT_DIR%.env"
set "ERRORS=0"

REM Check Node.js
echo [1/4] Checking Node.js...
if exist "%NODE_EXE%" (
    echo   ✓ Node.js found: %NODE_EXE%
    "%NODE_EXE%" --version >nul 2>&1
    if errorlevel 1 (
        echo   ✗ Node.js found but not working
        set /a ERRORS+=1
    ) else (
        for /f "tokens=*" %%i in ('"%NODE_EXE%" --version') do set NODE_VERSION=%%i
        echo   ✓ Node.js version: !NODE_VERSION!
    )
) else (
    echo   ✗ Node.js not found
    echo     Run setup_agents.bat to install Node.js
    set /a ERRORS+=1
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
    ) else (
        for /f "tokens=*" %%i in ('"%PNPM_EXE%" --version') do set PNPM_VERSION=%%i
        echo   ✓ pnpm version: !PNPM_VERSION!
    )
) else (
    echo   ✗ pnpm not found
    echo     Run setup_agents.bat to install pnpm
    set /a ERRORS+=1
)

REM Check node_modules
echo.
echo [3/4] Checking dependencies...
if exist "%SCRIPT_DIR%node_modules" (
    echo   ✓ node_modules found
) else (
    echo   ✗ node_modules not found
    echo     Run setup_agents.bat to install dependencies
    set /a ERRORS+=1
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
    ) else (
        echo   ✓ CLIENT_ID found
    )
    
    findstr /C:"API_TOKEN=" "%ENV_FILE%" >nul 2>&1
    if errorlevel 1 (
        echo   ✗ API_TOKEN not found in .env
        set /a ERRORS+=1
    ) else (
        echo   ✓ API_TOKEN found
    )
    
    findstr /C:"ENCRYPTION_KEY=" "%ENV_FILE%" >nul 2>&1
    if errorlevel 1 (
        echo   ✗ ENCRYPTION_KEY not found in .env
        set /a ERRORS+=1
    ) else (
        echo   ✓ ENCRYPTION_KEY found
    )
    
    REM Try to check registration status if Node.js is available
    if exist "%NODE_EXE%" if exist "%SCRIPT_DIR%node_modules" (
        echo.
        echo   Checking registration status...
        "%NODE_EXE%" -e "import('./modules-client/agent.js').then(m => {}).catch(() => {})" >nul 2>&1
        REM Note: Actual registration check would require running the agent
        echo   ℹ  Registration status will be checked when agent starts
    )
) else (
    echo   ✗ .env file not found
    echo     This file should have been created during installation
    set /a ERRORS+=1
)

echo.
echo ========================================
if %ERRORS% EQU 0 (
    echo ✓ All checks passed!
    echo.
    echo You can now run start_agent.bat to start the agent.
) else (
    echo ✗ Found %ERRORS% issue(s)
    echo.
    echo Please fix the issues above before starting the agent.
    echo Run setup_agents.bat if dependencies are missing.
)
echo ========================================
echo.
pause

