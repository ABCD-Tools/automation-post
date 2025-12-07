/**
 * Build Agent Template
 * 
 * Pre-builds the agent files into a ZIP template during deployment.
 * This avoids copying source files during runtime (which may not exist in Vercel).
 * 
 * Runs during: npm run build (prebuild step)
 * Output: public/agent-template.zip
 */

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// Get project root (script runs from project root via npm)
const projectRoot = process.cwd();

async function buildAgentTemplate() {
  console.log('[prebuild] Building agent template...');
  
  // Ensure public directory exists
  const publicDir = path.join(projectRoot, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  const templatePath = path.join(publicDir, 'agent-template.zip');
  const zip = new AdmZip();
  
  // Source directories
  const modulesClientDir = path.join(projectRoot, 'src', 'modules-client');
  const modulesAgentsDir = path.join(projectRoot, 'src', 'modules-agents');
  
  console.log('[prebuild] Source directories:');
  console.log(`  - modules-client: ${modulesClientDir}`);
  console.log(`  - modules-agents: ${modulesAgentsDir}`);
  
  // Check if source directories exist
  if (!fs.existsSync(modulesClientDir)) {
    throw new Error(`modules-client directory not found: ${modulesClientDir}`);
  }
  if (!fs.existsSync(modulesAgentsDir)) {
    throw new Error(`modules-agents directory not found: ${modulesAgentsDir}`);
  }
  
  // Add modules-client directory
  console.log('[prebuild] Adding modules-client files...');
  zip.addLocalFolder(modulesClientDir, 'modules-client');
  
  // Add modules-agents directory
  console.log('[prebuild] Adding modules-agents files...');
  zip.addLocalFolder(modulesAgentsDir, 'modules-agents');
  
  // Create a placeholder package.json (will be replaced with actual one during build)
  const packageJson = {
    name: 'abcd-tools-agent',
    version: '1.0.0',
    type: 'module',
    main: 'agent.js',
    dependencies: {
      'puppeteer-core': '^24.31.0',
      'dotenv': '^17.2.3',
      'axios': '^1.6.0',
      'pixelmatch': '^5.3.0',
      'pngjs': '^7.0.0',
      'jimp': '^0.22.10',
    },
  };
  zip.addFile('package.json', Buffer.from(JSON.stringify(packageJson, null, 2), 'utf-8'));
  
  // Create placeholder .env (will be replaced with custom one during build)
  const envPlaceholder = `# ABCD Tools Client Configuration
# This file will be replaced with custom configuration during build
# DO NOT share this file with anyone!
`;
  zip.addFile('.env', Buffer.from(envPlaceholder, 'utf-8'));
  
  // Create placeholder batch files
  const setupBatContent = `@echo off
REM ABCD Tools - Setup Script
REM Downloads and installs Node.js and pnpm to this directory

setlocal enabledelayedexpansion

echo ========================================
echo ABCD Tools - Setup
echo ========================================
echo.
echo This script will download and install:
echo   - Node.js portable binary (node.exe)
echo   - pnpm standalone executable (pnpm.exe)
echo.
echo Files will be downloaded to this directory.
echo.

REM Get the directory where this batch file is located
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM Check if node.exe already exists
if exist "%SCRIPT_DIR%node.exe" (
    echo Node.js already exists. Skipping download.
    goto :download_pnpm
)

echo [1/2] Downloading Node.js...
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
echo [2/2] Downloading pnpm...

REM Check if pnpm.exe already exists
if exist "%SCRIPT_DIR%pnpm.exe" (
    echo pnpm already exists. Skipping download.
    goto :setup_complete
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

:setup_complete
echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Run download_deps.bat to install dependencies
echo   2. Run start_agent.bat to start the agent
echo.
pause
`;
  zip.addFile('setup.bat', Buffer.from(setupBatContent, 'utf-8'));
  
  const downloadDepsBatContent = `@echo off
REM ABCD Tools - Download Dependencies
REM Installs node_modules using pnpm

setlocal

REM Get the directory where this batch file is located
set "SCRIPT_DIR=%~dp0"

REM Path to Node.js and pnpm binaries
set "NODE_EXE=%SCRIPT_DIR%node.exe"
set "PNPM_EXE=%SCRIPT_DIR%pnpm.exe"

REM Check if node.exe exists
if not exist "%NODE_EXE%" (
    echo ERROR: node.exe not found!
    echo Please run setup.bat first to download Node.js and pnpm.
    pause
    exit /b 1
)

REM Check if pnpm.exe exists
if not exist "%PNPM_EXE%" (
    echo ERROR: pnpm.exe not found!
    echo Please run setup.bat first to download Node.js and pnpm.
    pause
    exit /b 1
)

echo ========================================
echo Installing Dependencies
echo ========================================
echo.
echo Using Node.js: %NODE_EXE%
echo Using pnpm: %PNPM_EXE%
echo.

REM Change to script directory
cd /d "%SCRIPT_DIR%"

REM Set environment variable to use bundled Node.js for pnpm
set "PNPM_NODE_PATH=%NODE_EXE%"

REM Run pnpm install
echo Running pnpm install...
"%PNPM_EXE%" install

if errorlevel 1 (
    echo.
    echo ERROR: Failed to install dependencies with pnpm!
    echo.
    echo Trying with npm as fallback...
    "%NODE_EXE%" -e "const { execSync } = require('child_process'); execSync('npm install', { stdio: 'inherit' });"
    
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
echo Dependencies Installed Successfully!
echo ========================================
echo.
pause
`;
  zip.addFile('download_deps.bat', Buffer.from(downloadDepsBatContent, 'utf-8'));
  
  const startAgentBatContent = `@echo off
REM ABCD Tools - Start Agent
REM Starts the agent using the downloaded Node.js

setlocal

REM Get the directory where this batch file is located
set "SCRIPT_DIR=%~dp0"

REM Path to Node.js binary
set "NODE_EXE=%SCRIPT_DIR%node.exe"

REM Check if node.exe exists
if not exist "%NODE_EXE%" (
    echo ERROR: node.exe not found!
    echo Please run setup.bat first to download Node.js and pnpm.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "%SCRIPT_DIR%node_modules" (
    echo.
    echo WARNING: node_modules not found!
    echo Please run download_deps.bat first to install dependencies.
    echo.
    pause
    exit /b 1
)

REM Change to script directory
cd /d "%SCRIPT_DIR%"

REM Start the agent (assuming agent.js is in modules-client or root)
REM First try modules-client/agent.js, then root agent.js
if exist "%SCRIPT_DIR%modules-client\\agent.js" (
    set "AGENT_SCRIPT=%SCRIPT_DIR%modules-client\\agent.js"
) else if exist "%SCRIPT_DIR%agent.js" (
    set "AGENT_SCRIPT=%SCRIPT_DIR%agent.js"
) else (
    echo ERROR: agent.js not found!
    echo Expected location: modules-client\\agent.js or agent.js
    pause
    exit /b 1
)

echo.
echo Starting ABCD Tools Client...
echo Using Node.js: %NODE_EXE%
echo Agent script: %AGENT_SCRIPT%
echo.

REM Redirect errors to error.log
"%NODE_EXE%" "%AGENT_SCRIPT%" 2>>error.log

if errorlevel 1 (
    echo.
    echo Agent exited with error code: %errorlevel%
    echo Check error.log for details.
    pause
)
`;
  zip.addFile('start_agent.bat', Buffer.from(startAgentBatContent, 'utf-8'));
  
  // Add empty error.log
  zip.addFile('error.log', Buffer.from('', 'utf-8'));
  
  // Write ZIP file
  zip.writeZip(templatePath);
  
  // Get file size
  const stats = fs.statSync(templatePath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  
  console.log(`[prebuild] ✅ Agent template created: ${templatePath} (${sizeMB} MB)`);
}

// Run if executed directly
if (require.main === module) {
  buildAgentTemplate()
    .then(() => {
      console.log('[prebuild] ✅ Build complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[prebuild] ❌ Build failed:', error.message);
      process.exit(1);
    });
}

module.exports = { buildAgentTemplate };

