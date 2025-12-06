/**
 * Build Installer Executable
 * 
 * Packages the installer app as an .exe using pkg
 * Embeds the download URL and install path in the executable
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Build installer executable
 * @param {Object} config - Configuration
 * @param {string} config.downloadUrl - URL to download installer ZIP
 * @param {string} config.installPath - Installation path
 * @returns {Promise<Object>} Build result
 */
export async function buildInstallerExecutable(config) {
  const { downloadUrl, installPath } = config;
  
  if (!downloadUrl) {
    throw new Error('downloadUrl is required');
  }

  // Create temporary build directory
  const buildDir = path.join(__dirname, '../../.temp/installer-exe-build');
  await fs.mkdir(buildDir, { recursive: true });

  console.log('[DEBUG] Building installer executable...');
  console.log(`  Build directory: ${buildDir}`);

  try {
    // Read installer app source
    const installerAppPath = path.join(__dirname, 'installer-app.js');
    let installerAppSource = await fs.readFile(installerAppPath, 'utf-8');
    
    // Embed download URL and install path in the source code
    // Replace the default values with the actual values
    installerAppSource = installerAppSource.replace(
      /let downloadUrl = process\.argv\[2\] \|\| process\.env\.INSTALLER_DOWNLOAD_URL;/,
      `let downloadUrl = process.argv[2] || process.env.INSTALLER_DOWNLOAD_URL || '${downloadUrl.replace(/'/g, "\\'")}';`
    );
    
    installerAppSource = installerAppSource.replace(
      /let installPath = process\.argv\[3\] \|\| process\.env\.INSTALL_PATH \|\| '%LOCALAPPDATA%\\\\ABCDTools';/,
      `let installPath = process.argv[3] || process.env.INSTALL_PATH || '${(installPath || '%LOCALAPPDATA%\\ABCDTools').replace(/'/g, "\\'")}';`
    );
    
    // Write modified source
    const installerAppDest = path.join(buildDir, 'installer-app.js');
    await fs.writeFile(installerAppDest, installerAppSource, 'utf-8');

    // Create package.json for pkg
    // Configure pkg to use source code mode (scripts) instead of bytecode
    // This avoids the bytecode generation warning and is more compatible
    const packageJson = {
      name: 'abcd-tools-installer',
      version: '1.0.0',
      main: 'installer-app.js',
      type: 'module',
      pkg: {
        targets: ['node18-win-x64'],
        assets: [],
        outputPath: buildDir,
        scripts: [
          'installer-app.js'
        ],
        // Use source code instead of bytecode to avoid compilation issues
        // This is more compatible with ES modules and modern JavaScript
      },
      dependencies: {
        'adm-zip': '^0.5.10',
      },
    };

    const packageJsonPath = path.join(buildDir, 'package.json');
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

    // Install dependencies
    console.log('[DEBUG] Installing dependencies...');
    try {
      execSync('npm install', { cwd: buildDir, stdio: 'inherit' });
    } catch (error) {
      // Try with pnpm if npm fails
      try {
        execSync('pnpm install', { cwd: buildDir, stdio: 'inherit' });
      } catch (pnpmError) {
        throw new Error(`Failed to install dependencies: ${error.message}`);
      }
    }

    // Build executable with pkg
    // Using package.json config instead of command-line flags for better control
    console.log('[DEBUG] Building executable with pkg...');
    const exeName = 'ABCDToolsInstaller.exe';
    
    // Use package.json-based configuration (reads from package.json in buildDir)
    // This allows pkg to use the scripts configuration for source code mode
    const pkgCommand = `npx pkg . --targets node18-win-x64 --output "${path.join(buildDir, exeName)}"`;
    
    try {
      execSync(pkgCommand, { stdio: 'inherit', cwd: buildDir });
      console.log('[DEBUG] Executable built successfully');
    } catch (error) {
      // If package.json-based build fails, try direct file build as fallback
      console.log('[DEBUG] Package.json build failed, trying direct file build...');
      const fallbackCommand = `npx pkg "${installerAppDest}" --targets node18-win-x64 --output "${path.join(buildDir, exeName)}"`;
      try {
        execSync(fallbackCommand, { stdio: 'inherit', cwd: buildDir });
        console.log('[DEBUG] Executable built successfully (fallback method)');
      } catch (fallbackError) {
        throw new Error(`Failed to build executable: ${fallbackError.message}`);
      }
    }

    // Find the executable
    const exePath = path.join(buildDir, exeName);
    try {
      await fs.access(exePath);
      console.log(`[DEBUG] Installer executable ready: ${exePath}`);
      
      return {
        success: true,
        installerPath: exePath,
        buildDir,
      };
    } catch {
      throw new Error('Installer executable not found after build');
    }

  } catch (error) {
    console.error('[DEBUG] Build failed:', error.message);
    return {
      success: false,
      installerPath: null,
      message: error.message,
    };
  }
}

