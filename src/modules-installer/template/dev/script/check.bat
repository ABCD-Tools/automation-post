@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM Detect if running standalone or called from another script
REM ============================================================
set "IS_STANDALONE=0"
if "%~1"=="standalone" set "IS_STANDALONE=1"
if "%~1"=="" set "IS_STANDALONE=1"

REM Initialize
set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
set "ERROR_LOG=%SCRIPT_DIR%\error.log"

REM Clear and start error log
echo =========================================>> "%ERROR_LOG%" 2>nul
echo ABCD Tools - Installation Check>> "%ERROR_LOG%" 2>nul
echo =========================================>> "%ERROR_LOG%" 2>nul
echo Timestamp: %DATE% %TIME%>> "%ERROR_LOG%" 2>nul
echo Script Directory: %SCRIPT_DIR%>> "%ERROR_LOG%" 2>nul
echo Run Mode: %~1>> "%ERROR_LOG%" 2>nul
echo.>> "%ERROR_LOG%" 2>nul

REM Show header if standalone
if %IS_STANDALONE% EQU 1 (
    echo =========================================
    echo ABCD Tools - Installation Check
    echo =========================================
    echo.
    echo Script Directory: %SCRIPT_DIR%
    echo.
)

REM ============================================================
REM Navigate to agents directory
REM ============================================================
echo Navigating to agents directory...>> "%ERROR_LOG%" 2>nul
echo Current directory: %CD%>> "%ERROR_LOG%" 2>nul
echo Attempting: cd /d "%SCRIPT_DIR%\..">> "%ERROR_LOG%" 2>nul

cd /d "%SCRIPT_DIR%\.." 2>>"%ERROR_LOG%"
if errorlevel 1 (
    echo [CRITICAL ERROR] Cannot navigate to agents directory!>> "%ERROR_LOG%"
    echo Script directory: %SCRIPT_DIR%>> "%ERROR_LOG%"
    echo.>> "%ERROR_LOG%"
    
    if %IS_STANDALONE% EQU 1 (
        echo [ERROR] Cannot navigate to agents directory!
        echo See: %ERROR_LOG%
        echo.
        pause
    )
    exit /b 1
)

set "AGENTS_DIR=%CD%"
echo Successfully navigated to: %AGENTS_DIR%>> "%ERROR_LOG%" 2>nul
echo.>> "%ERROR_LOG%" 2>nul

REM ============================================================
REM Verify directory structure
REM ============================================================
echo Verifying directory structure...>> "%ERROR_LOG%" 2>nul
echo Looking for: %AGENTS_DIR%\start_agent.bat>> "%ERROR_LOG%" 2>nul

if not exist "%AGENTS_DIR%\start_agent.bat" (
    echo [ERROR] Invalid directory structure!>> "%ERROR_LOG%" 2>nul
    echo Current directory: %AGENTS_DIR%>> "%ERROR_LOG%" 2>nul
    echo Missing: start_agent.bat>> "%ERROR_LOG%" 2>nul
    echo.>> "%ERROR_LOG%" 2>nul
    
    if %IS_STANDALONE% EQU 1 (
        echo [ERROR] Invalid directory structure!
        echo Expected: %AGENTS_DIR%\start_agent.bat
        echo.
        pause
    )
    exit /b 1
)

echo [OK] Directory structure valid>> "%ERROR_LOG%" 2>nul
echo.>> "%ERROR_LOG%" 2>nul

REM ============================================================
REM Initialize check variables
REM ============================================================
set "NODE_EXE=%AGENTS_DIR%\node.exe"
set "PNPM_EXE=%AGENTS_DIR%\pnpm.exe"
set "NODE_MODULES=%AGENTS_DIR%\node_modules"
set "ENV_FILE=%AGENTS_DIR%\.env"
set "ERRORS=0"

if %IS_STANDALONE% EQU 1 (
    echo Checking directory: %AGENTS_DIR%
    echo.
)

REM ============================================================
REM CHECK 1: Node.js
REM ============================================================
echo =========================================>> "%ERROR_LOG%" 2>nul
echo [1/4] Checking Node.js>> "%ERROR_LOG%" 2>nul
echo =========================================>> "%ERROR_LOG%" 2>nul

if %IS_STANDALONE% EQU 1 echo [1/4] Checking Node.js...

if exist "%NODE_EXE%" (
    echo File exists: %NODE_EXE%>> "%ERROR_LOG%" 2>nul
    
    "%NODE_EXE%" --version >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Node.js cannot execute>> "%ERROR_LOG%" 2>nul
        echo File may be corrupted or blocked>> "%ERROR_LOG%" 2>nul
        echo.>> "%ERROR_LOG%" 2>nul
        
        if %IS_STANDALONE% EQU 1 echo   [ERROR] Node.js cannot execute
        set /a ERRORS+=1
    ) else (
        for /f "tokens=*" %%i in ('"%NODE_EXE%" --version 2^>nul') do (
            echo [OK] Node.js working - Version: %%i>> "%ERROR_LOG%" 2>nul
            if %IS_STANDALONE% EQU 1 echo   [OK] Node.js - Version: %%i
        )
    )
) else (
    echo [ERROR] Node.js NOT FOUND>> "%ERROR_LOG%" 2>nul
    echo Expected: %NODE_EXE%>> "%ERROR_LOG%" 2>nul
    echo Solution: Run setup_agents.bat>> "%ERROR_LOG%" 2>nul
    echo.>> "%ERROR_LOG%" 2>nul
    
    if %IS_STANDALONE% EQU 1 (
        echo   [ERROR] Node.js not found
        echo     Location: %NODE_EXE%
    )
    set /a ERRORS+=1
)

echo.>> "%ERROR_LOG%" 2>nul

REM ============================================================
REM CHECK 2: pnpm
REM ============================================================
echo =========================================>> "%ERROR_LOG%" 2>nul
echo [2/4] Checking pnpm>> "%ERROR_LOG%" 2>nul
echo =========================================>> "%ERROR_LOG%" 2>nul

if %IS_STANDALONE% EQU 1 (
    echo.
    echo [2/4] Checking pnpm...
)

if exist "%PNPM_EXE%" (
    echo File exists: %PNPM_EXE%>> "%ERROR_LOG%" 2>nul
    
    "%PNPM_EXE%" --version >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] pnpm cannot execute>> "%ERROR_LOG%" 2>nul
        echo File may be corrupted or blocked>> "%ERROR_LOG%" 2>nul
        echo.>> "%ERROR_LOG%" 2>nul
        
        if %IS_STANDALONE% EQU 1 echo   [ERROR] pnpm cannot execute
        set /a ERRORS+=1
    ) else (
        for /f "tokens=*" %%i in ('"%PNPM_EXE%" --version 2^>nul') do (
            echo [OK] pnpm working - Version: %%i>> "%ERROR_LOG%" 2>nul
            if %IS_STANDALONE% EQU 1 echo   [OK] pnpm - Version: %%i
        )
    )
) else (
    echo [ERROR] pnpm NOT FOUND>> "%ERROR_LOG%" 2>nul
    echo Expected: %PNPM_EXE%>> "%ERROR_LOG%" 2>nul
    echo Solution: Run setup_agents.bat>> "%ERROR_LOG%" 2>nul
    echo.>> "%ERROR_LOG%" 2>nul
    
    if %IS_STANDALONE% EQU 1 (
        echo   [ERROR] pnpm not found
        echo     Location: %PNPM_EXE%
    )
    set /a ERRORS+=1
)

echo.>> "%ERROR_LOG%" 2>nul

REM ============================================================
REM CHECK 3: node_modules
REM ============================================================
echo =========================================>> "%ERROR_LOG%" 2>nul
echo [3/4] Checking dependencies>> "%ERROR_LOG%" 2>nul
echo =========================================>> "%ERROR_LOG%" 2>nul

if %IS_STANDALONE% EQU 1 (
    echo.
    echo [3/4] Checking dependencies...
)

if exist "%NODE_MODULES%" (
    echo [OK] node_modules found>> "%ERROR_LOG%" 2>nul
    echo Location: %NODE_MODULES%>> "%ERROR_LOG%" 2>nul
    
    if %IS_STANDALONE% EQU 1 echo   [OK] node_modules found
    
    REM Check for key dependencies
    if exist "%NODE_MODULES%\dotenv" (
        echo [OK] Key dependency 'dotenv' found>> "%ERROR_LOG%" 2>nul
    ) else (
        echo [WARNING] Key dependency 'dotenv' not found>> "%ERROR_LOG%" 2>nul
        echo Dependencies may be incomplete>> "%ERROR_LOG%" 2>nul
    )
) else (
    echo [ERROR] node_modules NOT FOUND>> "%ERROR_LOG%" 2>nul
    echo Expected: %NODE_MODULES%>> "%ERROR_LOG%" 2>nul
    echo Solution: Run setup_agents.bat>> "%ERROR_LOG%" 2>nul
    echo.>> "%ERROR_LOG%" 2>nul
    
    if %IS_STANDALONE% EQU 1 (
        echo   [ERROR] node_modules not found
        echo     Location: %NODE_MODULES%
    )
    set /a ERRORS+=1
)

echo.>> "%ERROR_LOG%" 2>nul

REM ============================================================
REM CHECK 4: .env file
REM ============================================================
echo =========================================>> "%ERROR_LOG%" 2>nul
echo [4/4] Checking configuration>> "%ERROR_LOG%" 2>nul
echo =========================================>> "%ERROR_LOG%" 2>nul

if %IS_STANDALONE% EQU 1 (
    echo.
    echo [4/4] Checking configuration...
)

if exist "%ENV_FILE%" (
    echo [OK] .env file found>> "%ERROR_LOG%" 2>nul
    echo Location: %ENV_FILE%>> "%ERROR_LOG%" 2>nul
    
    if %IS_STANDALONE% EQU 1 echo   [OK] .env file found
    
    REM Check CLIENT_ID
    findstr /C:"CLIENT_ID=" "%ENV_FILE%" >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] CLIENT_ID not found in .env>> "%ERROR_LOG%" 2>nul
        echo This is a required configuration>> "%ERROR_LOG%" 2>nul
        echo.>> "%ERROR_LOG%" 2>nul
        
        if %IS_STANDALONE% EQU 1 echo   [ERROR] CLIENT_ID missing
        set /a ERRORS+=1
    ) else (
        for /f "tokens=2 delims==" %%a in ('findstr /C:"CLIENT_ID=" "%ENV_FILE%"') do (
            set "CLIENT_ID=%%a"
            set "CLIENT_ID_SHORT=!CLIENT_ID:~0,20!"
            echo [OK] CLIENT_ID found: !CLIENT_ID_SHORT!...>> "%ERROR_LOG%" 2>nul
            if %IS_STANDALONE% EQU 1 echo   [OK] CLIENT_ID: !CLIENT_ID_SHORT!...
        )
    )
    
    REM Check API_TOKEN
    findstr /C:"API_TOKEN=" "%ENV_FILE%" >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] API_TOKEN not found in .env>> "%ERROR_LOG%" 2>nul
        echo.>> "%ERROR_LOG%" 2>nul
        
        if %IS_STANDALONE% EQU 1 echo   [ERROR] API_TOKEN missing
        set /a ERRORS+=1
    ) else (
        echo [OK] API_TOKEN found>> "%ERROR_LOG%" 2>nul
        if %IS_STANDALONE% EQU 1 echo   [OK] API_TOKEN found
    )
    
    REM Check ENCRYPTION_KEY
    findstr /C:"ENCRYPTION_KEY=" "%ENV_FILE%" >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] ENCRYPTION_KEY not found in .env>> "%ERROR_LOG%" 2>nul
        echo.>> "%ERROR_LOG%" 2>nul
        
        if %IS_STANDALONE% EQU 1 echo   [ERROR] ENCRYPTION_KEY missing
        set /a ERRORS+=1
    ) else (
        echo [OK] ENCRYPTION_KEY found>> "%ERROR_LOG%" 2>nul
        if %IS_STANDALONE% EQU 1 echo   [OK] ENCRYPTION_KEY found
    )
    
    REM Check CLIENT_API_URL
    findstr /C:"CLIENT_API_URL=" "%ENV_FILE%" >nul 2>&1
    if errorlevel 1 (
        echo [WARNING] CLIENT_API_URL not found>> "%ERROR_LOG%" 2>nul
    ) else (
        for /f "tokens=2 delims==" %%a in ('findstr /C:"CLIENT_API_URL=" "%ENV_FILE%"') do (
            echo [OK] API URL: %%a>> "%ERROR_LOG%" 2>nul
            if %IS_STANDALONE% EQU 1 echo   [OK] API URL: %%a
        )
    )
) else (
    echo [ERROR] .env file NOT FOUND>> "%ERROR_LOG%" 2>nul
    echo Expected: %ENV_FILE%>> "%ERROR_LOG%" 2>nul
    echo This file contains API credentials>> "%ERROR_LOG%" 2>nul
    echo Solution: Reinstall the agent>> "%ERROR_LOG%" 2>nul
    echo.>> "%ERROR_LOG%" 2>nul
    
    if %IS_STANDALONE% EQU 1 (
        echo   [ERROR] .env file not found
        echo     Location: %ENV_FILE%
    )
    set /a ERRORS+=1
)

echo.>> "%ERROR_LOG%" 2>nul

REM ============================================================
REM Summary
REM ============================================================
echo =========================================>> "%ERROR_LOG%" 2>nul
echo CHECK SUMMARY>> "%ERROR_LOG%" 2>nul
echo =========================================>> "%ERROR_LOG%" 2>nul
echo.>> "%ERROR_LOG%" 2>nul

if %ERRORS% EQU 0 (
    echo [SUCCESS] All checks passed!>> "%ERROR_LOG%" 2>nul
    echo.>> "%ERROR_LOG%" 2>nul
    
    if %IS_STANDALONE% EQU 1 (
        echo.
        echo =========================================
        echo [SUCCESS] All checks passed!
        echo =========================================
        echo.
        echo Your ABCD Tools client is properly configured.
        echo You can now run start_agent.bat
        echo.
        echo Log saved: %ERROR_LOG%
        echo.
        pause
    )
    exit /b 0
) else (
    echo [FAILED] Found %ERRORS% issue(s)>> "%ERROR_LOG%" 2>nul
    echo.>> "%ERROR_LOG%" 2>nul
    
    if %IS_STANDALONE% EQU 1 (
        echo.
        echo =========================================
        echo [FAILED] Found %ERRORS% issue(s)
        echo =========================================
        echo.
        echo Full log: %ERROR_LOG%
        echo.
        echo To fix issues:
        echo   - Run start_agent.bat (recommended)
        echo   - Or run setup_agents.bat manually
        echo.
        pause
    )
    exit /b 1
)