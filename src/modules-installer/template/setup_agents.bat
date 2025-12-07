@echo off
REM ABCD Tools - Setup Agents
REM Downloads Node.js and pnpm, then installs dependencies

setlocal enabledelayedexpansion

echo ========================================
echo ABCD Tools - Setup Agents
echo ========================================
echo.
echo This script will:
echo   1. Download and install Node.js
echo   2. Download and install pnpm
echo   3. Install all dependencies
echo.

REM Get the directory where this batch file is located
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM Check if node.exe already exists
if exist "%SCRIPT_DIR%node.exe" (
    echo [1/3] Node.js already exists. Skipping download.
    goto :download_pnpm
)

echo [1/3] Downloading Node.js...
echo.

REM Download Node.js using PowerShell
set "NODE_VERSION=18.20.4"
set "NODE_URL=https://nodejs.org/dist/v%NODE_VERSION%/node-v%NODE_VERSION%-win-x64.zip"
set "NODE_ZIP=%SCRIPT_DIR%node.zip"
set "NODE_EXTRACT=%SCRIPT_DIR%node-extract"

powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%NODE_ZIP%'}"

if errorlevel 1 (
    echo ERROR: Failed to download Node.js
    echo Please check your internet connection and try again.
    pause
    exit /b 1
)

echo Extracting Node.js...
powershell -Command "Expand-Archive -Path '%NODE_ZIP%' -DestinationPath '%NODE_EXTRACT%' -Force"

if errorlevel 1 (
    echo ERROR: Failed to extract Node.js
    pause
    exit /b 1
)

REM Copy node.exe to script directory
copy "%NODE_EXTRACT%\\node-v%NODE_VERSION%-win-x64\\node.exe" "%SCRIPT_DIR%node.exe" >nul

REM Clean up
rmdir /s /q "%NODE_EXTRACT%" >nul 2>&1
del "%NODE_ZIP%" >nul 2>&1

if exist "%SCRIPT_DIR%node.exe" (
    echo   ✓ Node.js installed successfully
) else (
    echo ERROR: Failed to install Node.js
    pause
    exit /b 1
)

:download_pnpm
echo.
echo [2/3] Downloading pnpm...

REM Check if pnpm.exe already exists
if exist "%SCRIPT_DIR%pnpm.exe" (
    echo   pnpm already exists. Skipping download.
    goto :install_deps
)

REM Download pnpm using PowerShell
set "PNPM_URL=https://github.com/pnpm/pnpm/releases/latest/download/pnpm-win-x64.exe"
set "PNPM_EXE=%SCRIPT_DIR%pnpm.exe"

powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%PNPM_URL%' -OutFile '%PNPM_EXE%'}"

if errorlevel 1 (
    echo ERROR: Failed to download pnpm
    echo Please check your internet connection and try again.
    pause
    exit /b 1
)

if exist "%SCRIPT_DIR%pnpm.exe" (
    echo   ✓ pnpm installed successfully
) else (
    echo ERROR: Failed to install pnpm
    pause
    exit /b 1
)

:install_deps
echo.
echo [3/3] Installing dependencies...
echo.

REM Set environment variable to use bundled Node.js for pnpm
set "PNPM_NODE_PATH=%SCRIPT_DIR%node.exe"

REM Run pnpm install
echo Running pnpm install...
"%PNPM_EXE%" install

if errorlevel 1 (
    echo.
    echo ERROR: Failed to install dependencies with pnpm!
    echo.
    echo Trying with npm as fallback...
    "%SCRIPT_DIR%node.exe" -e "const { execSync } = require('child_process'); execSync('npm install', { stdio: 'inherit' });"
    
    if errorlevel 1 (
        echo.
        echo ERROR: Both pnpm and npm failed to install dependencies!
        echo.
        echo Troubleshooting:
        echo   1. Make sure you have internet connection
        echo   2. Check if antivirus is blocking the installation
        echo   3. Try running as administrator
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Run check.bat to verify installation
echo   2. Run start_agent.bat to start the agent
echo.
pause

