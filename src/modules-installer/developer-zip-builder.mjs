/**
 * Build Developer ZIP for Debug Mode
 * 
 * Creates a ZIP file containing:
 * - Node.js portable binary (node.exe)
 * - modules-agents (all agent files)
 * - setup.bat (execution policy bypass)
 * - download_deps.bat (download node_modules on client side)
 * - start_agent.bat (start the agent)
 * - error.log (empty log file)
 * 
 * This is for developers who want to run the client directly without the executable.
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import AdmZip from 'adm-zip';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get a unique build directory in the temp folder
 * @param {string} prefix - Prefix for the directory name
 * @returns {string} Path to the build directory
 */
function getBuildDir(prefix = 'build') {
  const tempBase = process.env.TMPDIR || os.tmpdir();
  const uniqueId = uuidv4();
  return path.join(tempBase, `abcd-tools-${prefix}-${uniqueId}`);
}

/**
 * Download Node.js portable binary for Windows
 * @param {string} destDir - Destination directory
 * @returns {Promise<string>} Path to node.exe
 */
async function downloadNodeBinary(destDir) {
  const nodeVersion = '18.20.4'; // Node.js 18 LTS
  const nodeUrl = `https://nodejs.org/dist/v${nodeVersion}/node-v${nodeVersion}-win-x64.zip`;
  const zipPath = path.join(destDir, 'node.zip');
  const extractDir = path.join(destDir, 'node-extract');
  const nodeExePath = path.join(extractDir, `node-v${nodeVersion}-win-x64`, 'node.exe');
  const finalNodePath = path.join(destDir, 'node.exe');

  // Check if node.exe already exists
  try {
    await fs.access(finalNodePath);
    console.log('   ✓ Node.js binary already exists');
    return finalNodePath;
  } catch {
    // Node.js not found, need to download
  }

  console.log(`   Downloading Node.js v${nodeVersion}...`);
  
  return new Promise((resolve, reject) => {
    const protocol = nodeUrl.startsWith('https') ? https : http;
    const file = fsSync.createWriteStream(zipPath);
    
    protocol.get(nodeUrl, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadNodeBinary(destDir).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download Node.js: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log('   ✓ Node.js downloaded');
        
        // Extract ZIP asynchronously
        (async () => {
          try {
            // Extract ZIP
            const zip = new AdmZip(zipPath);
            await fs.mkdir(extractDir, { recursive: true });
            zip.extractAllTo(extractDir, true);
            
            // Copy node.exe to root
            await fs.copyFile(nodeExePath, finalNodePath);
            
            // Clean up
            await fs.unlink(zipPath);
            await fs.rm(extractDir, { recursive: true, force: true });
            
            console.log('   ✓ Node.js extracted to node.exe');
            resolve(finalNodePath);
          } catch (err) {
            reject(new Error(`Failed to extract Node.js: ${err.message}`));
          }
        })();
      });
      
      file.on('error', (err) => {
        fsSync.unlink(zipPath, () => {});
        reject(err);
      });
    }).on('error', reject);
  });
}

/**
 * Download pnpm standalone executable for Windows
 * @param {string} destDir - Destination directory
 * @returns {Promise<string>} Path to pnpm.exe
 */
async function downloadPnpmBinary(destDir) {
  // pnpm standalone executable URL (latest version)
  // Using the standalone Windows executable from pnpm releases
  const pnpmUrl = 'https://github.com/pnpm/pnpm/releases/latest/download/pnpm-win-x64.exe';
  const finalPnpmPath = path.join(destDir, 'pnpm.exe');

  // Check if pnpm.exe already exists
  try {
    await fs.access(finalPnpmPath);
    console.log('   ✓ pnpm.exe already exists');
    return finalPnpmPath;
  } catch {
    // pnpm not found, need to download
  }

  console.log('   Downloading pnpm standalone executable...');
  
  return new Promise((resolve, reject) => {
    const protocol = pnpmUrl.startsWith('https') ? https : http;
    const file = fsSync.createWriteStream(finalPnpmPath);
    
    protocol.get(pnpmUrl, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirect
        return downloadPnpmBinary(destDir).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download pnpm: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log('   ✓ pnpm.exe downloaded');
        resolve(finalPnpmPath);
      });
      
      file.on('error', (err) => {
        fsSync.unlink(finalPnpmPath, () => {});
        reject(err);
      });
    }).on('error', reject);
  });
}

/**
 * Copy directory recursively
 */
async function copyDirectory(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Build developer ZIP package
 * @param {Object} config - Configuration
 * @param {string} config.apiEndpoint - API endpoint
 * @param {string} config.apiToken - API token
 * @param {string} config.clientId - Client ID
 * @param {string} config.encryptionKey - Encryption key
 * @param {string} config.decryptionKey - Decryption key
 * @param {string} config.browserPath - Browser path
 * @param {string} config.installPath - Install path
 * @returns {Promise<Object>} Build result
 */
export async function buildDeveloperZip(config) {
  const {
    apiEndpoint,
    apiToken,
    clientId,
    encryptionKey,
    decryptionKey,
    browserPath,
    installPath,
    downloadToken,
  } = config;

  const buildDir = getBuildDir('developer-zip');
  
  // Create build directory with error handling
  try {
    await fs.mkdir(buildDir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }

  console.log('📦 Building developer ZIP...');
  console.log(`   Build directory: ${buildDir}`);
  console.log(`   Download token: ${downloadToken ? 'Present' : 'Missing'}\n`);

  try {
    // Step 1: Copy modules-agents and modules-client
    console.log('[1/5] Copying modules...');
    
    // Task 4: Diagnostic logging
    console.log('[DEBUG] __dirname:', __dirname);
    console.log('[DEBUG] process.cwd():', process.cwd());
    
    // Check if pre-built template exists (Task 7 approach)
    const templatePath = path.join(process.cwd(), 'public', 'agent-template.zip');
    const templateExists = await fs.access(templatePath).then(() => true).catch(() => false);
    
    if (templateExists) {
      console.log('[DEBUG] Found pre-built agent template, using template approach...');
      console.log('[DEBUG] Template path:', templatePath);
      
      // Use pre-built template approach (Task 7)
      const customZipPath = path.join(buildDir, 'ABCDTools-Developer.zip');
      
      // Copy template to build directory
      await fs.copyFile(templatePath, customZipPath);
      console.log('   ✓ Agent template copied');
      
      // Add custom .env to existing ZIP
      const zip = new AdmZip(customZipPath);
      const envContent = `# ABCD Tools Client Configuration
# DO NOT share this file with anyone!

# API Connection
CLIENT_API_URL=${apiEndpoint}
CLIENT_ID=${clientId}
API_TOKEN=${apiToken}

# Local Encryption Keys (NEVER sent to server)
ENCRYPTION_KEY=${encryptionKey}
DECRYPTION_KEY=${decryptionKey}

# Browser Configuration
BROWSER_PATH=${browserPath}

# Optional: Advanced Settings
LOG_LEVEL=info
POLLING_INTERVAL=10000
MAX_JOBS_PER_CYCLE=5
IDLE_TIMEOUT=300000

# Installation
DOWNLOAD_TOKEN=${downloadToken || ''}
INSTALL_PATH=${installPath}

# Agent Version
AGENT_VERSION=1.0.0
`;
      zip.addFile('agents/.env', Buffer.from(envContent, 'utf-8'));
      zip.writeZip(customZipPath);
      console.log('   ✓ Custom .env injected into template');
      
      // Skip to Step 5 (creating error.log and finalizing)
      console.log('\n[5/5] Creating error.log...');
      const errorLogPath = path.join(buildDir, 'error.log');
      await fs.writeFile(errorLogPath, '', 'utf-8');
      console.log('   ✓ error.log created');
      
      return {
        success: true,
        zipPath: customZipPath,
        buildDir,
      };
    }
    
    // Fallback: Try to copy source files (with diagnostics)
    console.log('[DEBUG] Template not found, attempting to copy source files...');
    const agentsSourceDir = path.join(__dirname, '../modules-agents');
    const clientSourceDir = path.join(__dirname, '../modules-client');
    
    console.log('[DEBUG] Resolved agents source path:', agentsSourceDir);
    console.log('[DEBUG] Resolved client source path:', clientSourceDir);
    
    // Check if source paths exist
    try {
      const agentsExists = await fs.access(agentsSourceDir).then(() => true).catch(() => false);
      const clientExists = await fs.access(clientSourceDir).then(() => true).catch(() => false);
      
      console.log('[DEBUG] Agents source exists?', agentsExists);
      console.log('[DEBUG] Client source exists?', clientExists);
      
      if (!agentsExists || !clientExists) {
        // List deployment structure for debugging
        console.log('[DEBUG] Listing deployment structure:');
        console.log('[DEBUG] process.cwd():', process.cwd());
        try {
          const cwdContents = await fs.readdir(process.cwd());
          console.log('[DEBUG] Contents of cwd:', cwdContents.slice(0, 20));
        } catch (e) {
          console.log('[DEBUG] Cannot read cwd:', e.message);
        }
        
        const possiblePaths = [
          path.join(process.cwd(), '.next', 'server'),
          path.join(process.cwd(), 'dist'),
          '/var/task',
          '/var/task/src',
          path.join(process.cwd(), 'src'),
        ];
        
        for (const p of possiblePaths) {
          try {
            const exists = await fs.access(p).then(() => true).catch(() => false);
            if (exists) {
              const contents = await fs.readdir(p);
              console.log(`[DEBUG] Found: ${p}`, contents.slice(0, 10));
            }
          } catch (e) {
            // Ignore
          }
        }
        
        throw new Error(`Source directories not found. Agents: ${agentsExists}, Client: ${clientExists}. Please ensure agent-template.zip is built during deployment.`);
      }
      
      const agentsDestDir = path.join(buildDir, 'modules-agents');
      await copyDirectory(agentsSourceDir, agentsDestDir);
      console.log('   ✓ modules-agents copied');
      
      const clientDestDir = path.join(buildDir, 'modules-client');
      await copyDirectory(clientSourceDir, clientDestDir);
      console.log('   ✓ modules-client copied');
    } catch (error) {
      console.error('[ERROR] Failed to copy source files:', error.message);
      throw error;
    }

    // Step 2: Create package.json for dependencies
    console.log('\n[2/5] Creating package.json...');
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
    const packageJsonPath = path.join(buildDir, 'package.json');
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('   ✓ package.json created');

    // Step 3: Create .env file
    console.log('\n[3/5] Creating .env file...');
    
    // Escape newlines in PEM keys for .env file format
    // dotenv can handle multi-line values, but we'll escape them to be safe
    const escapeEnvValue = (value) => {
      if (!value) return '';
      // Replace actual newlines with escaped newlines for .env compatibility
      return value.replace(/\n/g, '\\n');
    };
    
    const envContent = `# ABCD Tools Client Configuration
# DO NOT share this file with anyone!

# API Connection
CLIENT_API_URL=${apiEndpoint}
CLIENT_ID=${clientId}
API_TOKEN=${apiToken}

# Local Encryption Keys (NEVER sent to server)
# Note: Keys are in PEM format with escaped newlines (\\n)
ENCRYPTION_KEY=${escapeEnvValue(encryptionKey)}
DECRYPTION_KEY=${escapeEnvValue(decryptionKey)}

# Browser Configuration
BROWSER_PATH=${browserPath}

# Optional: Advanced Settings
LOG_LEVEL=info
POLLING_INTERVAL=10000
MAX_JOBS_PER_CYCLE=5
IDLE_TIMEOUT=300000

# Installation
DOWNLOAD_TOKEN=${downloadToken || ''}
INSTALL_PATH=${installPath}

# Agent Version
AGENT_VERSION=1.0.0
`;
    const envPath = path.join(buildDir, '.env');
    await fs.writeFile(envPath, envContent, 'utf-8');
    console.log('   ✓ .env file created');

    // Step 4: Create batch files
    console.log('\n[4/5] Creating batch files...');
    
    // setup.bat - Download and install Node.js and pnpm
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
    const setupBatPath = path.join(buildDir, 'setup.bat');
    await fs.writeFile(setupBatPath, setupBatContent, 'utf-8');
    console.log('   ✓ setup.bat created');

    // download_deps.bat - Download node_modules using pnpm
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
    const downloadDepsBatPath = path.join(buildDir, 'download_deps.bat');
    await fs.writeFile(downloadDepsBatPath, downloadDepsBatContent, 'utf-8');
    console.log('   ✓ download_deps.bat created');

    // start_agent.bat - Start the agent
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
    const startAgentBatPath = path.join(buildDir, 'start_agent.bat');
    await fs.writeFile(startAgentBatPath, startAgentBatContent, 'utf-8');
    console.log('   ✓ start_agent.bat created');

    // Step 5: Create error.log (empty file)
    console.log('\n[5/5] Creating error.log...');
    const errorLogPath = path.join(buildDir, 'error.log');
    await fs.writeFile(errorLogPath, '', 'utf-8');
    console.log('   ✓ error.log created');

    // Create ZIP file
    console.log('\n📦 Creating ZIP archive...');
    const zipPath = path.join(buildDir, 'ABCDTools-Developer.zip');
    const zip = new AdmZip();

    // Add modules-agents directory
    zip.addLocalFolder(agentsDestDir, 'modules-agents');
    
    // Add modules-client directory (no node.exe or pnpm.exe - downloaded by setup.bat)
    zip.addLocalFolder(clientDestDir, 'modules-client');
    
    // Add package.json
    zip.addLocalFile(packageJsonPath, '', 'package.json');
    
    // Add .env file
    zip.addLocalFile(envPath, '', '.env');
    
    // Add batch files
    zip.addLocalFile(setupBatPath, '', 'setup.bat');
    zip.addLocalFile(downloadDepsBatPath, '', 'download_deps.bat');
    zip.addLocalFile(startAgentBatPath, '', 'start_agent.bat');
    
    // Add error.log
    zip.addLocalFile(errorLogPath, '', 'error.log');

    // Add README for developers
    const readmeContent = `ABCD Tools Client - Developer Package
=====================================

This is a developer package for running the ABCD Tools client directly.

Contents:
- setup.bat              : Downloads and installs Node.js and pnpm
- download_deps.bat      : Installs node_modules using pnpm
- start_agent.bat        : Starts the agent
- modules-agents/         : Platform agent files (Instagram, Facebook, Twitter, etc.)
- modules-client/         : Client agent files (agent.js, poller.js, etc.)
- package.json            : Dependencies configuration
- .env                  : Configuration file (DO NOT SHARE!)
- setup.bat             : Setup script (execution policy bypass)
- download_deps.bat     : Install node_modules
- start_agent.bat       : Start the agent
- error.log             : Error log file

Setup Instructions:
1. Extract this ZIP to a directory
2. Run setup.bat (downloads Node.js and pnpm to this directory)
3. Run download_deps.bat (installs node_modules)
4. Run start_agent.bat (starts the agent)

Note: Node.js and pnpm are downloaded automatically by setup.bat.
No need to install them separately!

Configuration:
- All settings are in .env
- Edit .env to change API endpoint, keys, etc.

Requirements:
- Windows OS
- Chrome or Edge browser installed

For support, visit: https://yoursite.com/support
`;
    zip.addFile('README.txt', Buffer.from(readmeContent, 'utf-8'));

    zip.writeZip(zipPath);
    console.log(`   ✓ ZIP created: ${zipPath}`);

    return {
      success: true,
      zipPath,
      buildDir,
    };

  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    return {
      success: false,
      zipPath: null,
      buildDir,
      message: error.message,
    };
  } finally {
    // Cleanup: Remove build directory after a delay to allow file operations to complete
    // Note: In production, you may want to keep the directory until the file is uploaded
    // For now, we'll let Vercel clean it up automatically, but this is here for reference
    // Uncomment if you want immediate cleanup:
    // try {
    //   await fs.rm(buildDir, { recursive: true, force: true });
    // } catch (cleanupError) {
    //   console.warn('Failed to cleanup build directory:', cleanupError.message);
    // }
  }
}
