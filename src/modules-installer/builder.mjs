/**
 * Generate Windows installer package
 * 
 * Input:
 * {
 *   userId: string,
 *   apiToken: string,
 *   apiEndpoint: string,
 *   installPath: string,
 *   browserPath: string,
 *   encryptionKey: string,
 *   decryptionKey: string,
 *   clientId: string
 * }
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync } from 'child_process';
import { bundleClientFiles } from './package.mjs';
import { v4 as uuidv4 } from 'uuid';
import AdmZip from 'adm-zip';

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
 * Generate installer package
 */
export async function buildInstaller(config) {
  const {
    userId,
    apiToken,
    apiEndpoint,
    installPath,
    browserPath,
    encryptionKey,
    decryptionKey,
    clientId,
    downloadToken,
  } = config;
  
  // Create temporary build directory
  const buildDir = getBuildDir('installer');
  
  // Create build directory with error handling
  try {
    await fs.mkdir(buildDir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
  
  console.log('📦 Building installer...');
  console.log(`   Build directory: ${buildDir}\n`);

  try {
    // Step 1: Bundle client files
    console.log('[1/8] Bundling client files...');
    const bundledDir = await bundleClientFiles();
    
    // Step 2: Run pkg to create agent.exe
    console.log('\n[2/8] Creating agent.exe with pkg...');
    const agentJsPath = path.join(bundledDir, 'agent.js');
    const agentExePath = path.join(buildDir, 'agent.exe');
    
    // Use npx pkg since pkg might not be in PATH
    const pkgCommand = `npx pkg "${agentJsPath}" --targets node18-win-x64 --output "${agentExePath}"`;
    
    try {
      execSync(pkgCommand, { stdio: 'inherit', cwd: bundledDir });
      console.log('   ✓ agent.exe created');
    } catch (error) {
      throw new Error(`Failed to create agent.exe: ${error.message}`);
    }
    
    // Step 3: Generate .env file
    console.log('\n[3/8] Generating .env file...');
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
    
    const envPath = path.join(buildDir, '.env');
    await fs.writeFile(envPath, envContent, 'utf-8');
    console.log('   ✓ .env file created');
    
    // Step 4: Create register-protocol.reg
    console.log('\n[4/8] Creating protocol registration file...');
    const regContent = `Windows Registry Editor Version 5.00

[HKEY_CURRENT_USER\\Software\\Classes\\abcdtools]
@="URL:ABCD Tools Protocol"
"URL Protocol"=""

[HKEY_CURRENT_USER\\Software\\Classes\\abcdtools\\shell]

[HKEY_CURRENT_USER\\Software\\Classes\\abcdtools\\shell\\open]

[HKEY_CURRENT_USER\\Software\\Classes\\abcdtools\\shell\\open\\command]
@="\\"{app}\\\\agent.exe\\" \\"%1\\""
`;
    
    const regPath = path.join(buildDir, 'register-protocol.reg');
    await fs.writeFile(regPath, regContent, 'utf-8');
    console.log('   ✓ register-protocol.reg created');
    
    // Step 5: Create README.txt
    console.log('\n[5/8] Creating README.txt...');
    const readmeContent = `ABCD Tools Client
====================

Installation Instructions:
1. Run ABCDToolsSetup.exe
2. Follow the installation wizard
3. The agent will start automatically

Configuration:
- All settings are stored in .env file
- Do not modify .env unless instructed

Troubleshooting:
- If the agent doesn't start, check the logs folder
- Ensure Chrome or Edge is installed
- Check that the API endpoint is accessible

For support, visit: https://yoursite.com/support
`;
    
    const readmePath = path.join(buildDir, 'README.txt');
    await fs.writeFile(readmePath, readmeContent, 'utf-8');
    console.log('   ✓ README.txt created');
    
    // Step 6: Create Inno Setup script
    console.log('\n[6/8] Creating Inno Setup script...');
    // Normalize install path for Inno Setup
    // If installPath contains {localappdata}, use it directly
    // Otherwise, convert to Inno Setup format
    let defaultDirName = installPath;
    if (!installPath.includes('{localappdata}') && !installPath.includes('{app}')) {
      // Convert Windows path to Inno Setup format
      defaultDirName = '{localappdata}\\ABCDTools';
    }
    
    const issContent = `[Setup]
AppName=ABCD Tools Client
AppVersion=1.0.0
DefaultDirName=${defaultDirName}
DefaultGroupName=ABCD Tools
OutputBaseFilename=ABCDToolsSetup
Compression=lzma2
SolidCompression=yes
PrivilegesRequired=admin
OutputDir=${buildDir}

[Files]
Source: "${agentExePath}"; DestDir: "{app}"; Flags: ignoreversion
Source: "${envPath}"; DestDir: "{app}"; Flags: ignoreversion
Source: "${regPath}"; DestDir: "{app}"; Flags: ignoreversion
Source: "${readmePath}"; DestDir: "{app}"; Flags: ignoreversion

[Registry]
Root: HKCU; Subkey: "Software\\Classes\\abcdtools"; ValueType: string; ValueData: "URL:ABCD Tools Protocol"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\\Classes\\abcdtools"; ValueType: string; ValueName: "URL Protocol"; ValueData: ""; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\\Classes\\abcdtools\\shell\\open\\command"; ValueType: string; ValueData: "\\"{app}\\agent.exe\\" \\"%1\\""; Flags: uninsdeletekey

[Run]
Filename: "regedit.exe"; Parameters: "/s \\"{app}\\register-protocol.reg\\""; StatusMsg: "Registering protocol handler..."; Flags: runhidden

[UninstallDelete]
Type: filesandordirs; Name: "{app}"
`;
    
    const issPath = path.join(buildDir, 'installer.iss');
    await fs.writeFile(issPath, issContent, 'utf-8');
    console.log('   ✓ installer.iss created');
    
    // Step 7: Compile installer with Inno Setup
    console.log('\n[7/8] Compiling installer with Inno Setup...');
    
    // Try to find Inno Setup compiler using multiple methods
    let isccPath = null;
    
    // Method 1: Check environment variable
    if (process.env.INNO_SETUP_PATH) {
      const envPath = path.join(process.env.INNO_SETUP_PATH, 'ISCC.exe');
      try {
        await fs.access(envPath);
        isccPath = envPath;
        console.log('   ✓ Found Inno Setup via INNO_SETUP_PATH');
      } catch {
        // Not found
      }
    }
    
    // Method 2: Check common installation paths
    if (!isccPath) {
      const commonPaths = [
        'C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe',
        'C:\\Program Files\\Inno Setup 6\\ISCC.exe',
        'C:\\Program Files (x86)\\Inno Setup 5\\ISCC.exe',
        'C:\\Program Files\\Inno Setup 5\\ISCC.exe',
        path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Inno Setup 6', 'ISCC.exe'),
        path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Inno Setup 6', 'ISCC.exe'),
        path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Inno Setup 5', 'ISCC.exe'),
        path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Inno Setup 5', 'ISCC.exe'),
      ];
      
      for (const innoPath of commonPaths) {
        try {
          await fs.access(innoPath);
          isccPath = innoPath;
          console.log(`   ✓ Found Inno Setup at: ${innoPath}`);
          break;
        } catch {
          // Path doesn't exist, try next
        }
      }
    }
    
    // Method 3: Try to find via Windows registry (if on Windows)
    if (!isccPath && process.platform === 'win32') {
      try {
        // Check registry for Inno Setup installation path
        const regQuery = 'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Inno Setup 6_is1" /v InstallLocation 2>nul';
        try {
          const regOutput = execSync(regQuery, { encoding: 'utf8', stdio: 'pipe' });
          const match = regOutput.match(/InstallLocation\s+REG_SZ\s+(.+)/);
          if (match && match[1]) {
            const installDir = match[1].trim();
            const isccPathFromReg = path.join(installDir, 'ISCC.exe');
            try {
              await fs.access(isccPathFromReg);
              isccPath = isccPathFromReg;
              console.log(`   ✓ Found Inno Setup via registry: ${isccPath}`);
            } catch {
              // Not found
            }
          }
        } catch {
          // Registry query failed, continue
        }
      } catch {
        // Import failed or not Windows
      }
    }
    
    // Method 4: Try to find via PATH environment variable
    if (!isccPath && process.platform === 'win32') {
      try {
        // Use 'where' command to find ISCC.exe in PATH
        const whereOutput = execSync('where ISCC.exe 2>nul', { encoding: 'utf8', stdio: 'pipe' });
        const paths = whereOutput.trim().split('\n').filter(Boolean);
        for (const foundPath of paths) {
          try {
            await fs.access(foundPath.trim());
            isccPath = foundPath.trim();
            console.log(`   ✓ Found Inno Setup in PATH: ${isccPath}`);
            break;
          } catch {
            // Not accessible
          }
        }
      } catch {
        // 'where' command failed or not in PATH
      }
    }
    
    if (!isccPath) {
      console.warn('   ⚠️  Inno Setup not found. Creating ZIP archive as fallback...');
      console.warn('   To enable automatic compilation:');
      console.warn('   1. Install Inno Setup from: https://jrsoftware.org/isinfo.php');
      console.warn(`   2. Set INNO_SETUP_PATH environment variable to Inno Setup installation directory`);
      console.warn(`   3. Or add Inno Setup to your system PATH`);
      console.warn(`   4. Or compile manually: ISCC.exe "${issPath}"`);
      
      // Create ZIP archive as fallback
      try {
        const zipPath = path.join(buildDir, 'ABCDToolsSetup.zip');
        const zip = new AdmZip();
        
        // Add all files to ZIP
        zip.addLocalFile(agentExePath, '', 'agent.exe');
        zip.addLocalFile(envPath, '', '.env');
        zip.addLocalFile(regPath, '', 'register-protocol.reg');
        zip.addLocalFile(readmePath, '', 'README.txt');
        zip.addLocalFile(issPath, '', 'installer.iss');
        
        // Add installation instructions
        const installInstructions = `ABCD Tools Client - Installation Instructions
================================================

Since Inno Setup is not available, please follow these steps:

1. Extract all files from this ZIP to a folder (e.g., C:\\ABCDTools)

2. Run register-protocol.reg to register the protocol handler
   (Double-click the file and confirm)

3. Create a shortcut to agent.exe if desired

4. Run agent.exe to start the client

Alternatively, install Inno Setup and compile installer.iss to create a proper installer.

For support, visit: https://yoursite.com/support
`;
        
        zip.addFile('INSTALL_INSTRUCTIONS.txt', Buffer.from(installInstructions, 'utf-8'));
        
        zip.writeZip(zipPath);
        console.log(`   ✓ Created ZIP archive: ${zipPath}`);
        
        return {
          success: true,
          installerPath: zipPath,
          buildDir,
          issPath,
          message: 'Inno Setup not found. ZIP archive created instead. Install Inno Setup for automatic compilation.',
        };
      } catch (zipError) {
        console.error('   ❌ Failed to create ZIP archive:', zipError.message);
        return {
          success: false,
          installerPath: null,
          buildDir,
          issPath,
          message: 'Inno Setup not found and ZIP creation failed. Please install Inno Setup or compile manually.',
        };
      }
    }
    
    try {
      execSync(`"${isccPath}" "${issPath}"`, { stdio: 'inherit' });
      console.log('   ✓ Installer compiled successfully');
    } catch (error) {
      throw new Error(`Failed to compile installer: ${error.message}`);
    }
    
    // Step 8: Find installer executable
    console.log('\n[8/8] Locating installer executable...');
    const installerPath = path.join(buildDir, 'ABCDToolsSetup.exe');
    
    try {
      await fs.access(installerPath);
      console.log(`   ✓ Installer ready: ${installerPath}`);
    } catch {
      // Try OutputDir from Inno Setup
      const outputPath = path.join(buildDir, 'Output', 'ABCDToolsSetup.exe');
      try {
        await fs.access(outputPath);
        console.log(`   ✓ Installer ready: ${outputPath}`);
        return {
          success: true,
          installerPath: outputPath,
          buildDir,
        };
      } catch {
        throw new Error('Installer executable not found after compilation');
      }
    }
    
    return {
      success: true,
      installerPath,
      buildDir,
    };
    
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    throw error;
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

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Test build with sample config
  const testConfig = {
    userId: 'test-user-id',
    apiToken: 'test-api-token',
    apiEndpoint: 'https://api.example.com/api/client',
    installPath: 'C:\\Users\\Test\\AppData\\Local\\ABCDTools',
    browserPath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    encryptionKey: '0123456789abcdef0123456789abcdef',
    decryptionKey: 'fedcba9876543210fedcba9876543210',
    clientId: 'test-client-id',
    downloadToken: 'test-download-token',
  };
  
  buildInstaller(testConfig)
    .then((result) => {
      if (result.success) {
        console.log(`\n✅ Installer created: ${result.installerPath}`);
      } else {
        console.log(`\n⚠️  ${result.message}`);
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Build failed:', error);
      process.exit(1);
    });
}
