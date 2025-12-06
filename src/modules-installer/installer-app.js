/**
 * ABCD Tools Installer Application
 * 
 * This is a Node.js application that will be packaged as an .exe
 * It downloads, extracts, and installs ABCD Tools automatically
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import AdmZip from 'adm-zip';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

// Note: We don't need __dirname in this installer app
// All paths are resolved from command line arguments or environment variables

// Debug mode detection
const DEBUG = process.env.DEBUG === 'true' || process.argv.includes('--debug') || process.argv.includes('-d');

// Debug log file path
const DEBUG_LOG_FILE = path.join(tmpdir(), 'abcd-tools-installer-debug.log');

// Debug logging function
function debugLog(message, ...args) {
  if (DEBUG) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage, ...args);
    
    // Also write to log file
    try {
      const fullMessage = logMessage + (args.length > 0 ? ' ' + args.map(a => 
        typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
      ).join(' ') : '') + '\n';
      fsSync.appendFileSync(DEBUG_LOG_FILE, fullMessage);
    } catch (err) {
      // Ignore log file errors
      console.error('Failed to write to debug log:', err.message);
    }
  }
}

// Log debug mode status
if (DEBUG) {
  debugLog('═══════════════════════════════════════════════════════════');
  debugLog('DEBUG MODE ENABLED');
  debugLog('═══════════════════════════════════════════════════════════');
  debugLog('Debug log file:', DEBUG_LOG_FILE);
  debugLog('Command line arguments:', process.argv);
  debugLog('Environment variables:', {
    DEBUG: process.env.DEBUG,
    INSTALLER_DOWNLOAD_URL: process.env.INSTALLER_DOWNLOAD_URL,
    INSTALL_PATH: process.env.INSTALL_PATH,
    LOCALAPPDATA: process.env.LOCALAPPDATA,
    USERPROFILE: process.env.USERPROFILE,
    APPDATA: process.env.APPDATA,
  });
  debugLog('═══════════════════════════════════════════════════════════\n');
}

// Get download URL and install path from command line arguments or environment
let downloadUrl = process.argv[2] || process.env.INSTALLER_DOWNLOAD_URL;
let installPath = process.argv[3] || process.env.INSTALL_PATH || '%LOCALAPPDATA%\\ABCDTools';

debugLog('Initial configuration:', {
  downloadUrl: downloadUrl ? '***SET***' : 'MISSING',
  installPath,
  argsCount: process.argv.length,
});

// If no URL provided, show error and pause
if (!downloadUrl) {
  debugLog('ERROR: Download URL is missing');
  console.error('═══════════════════════════════════════════════════════════');
  console.error('❌ Error: Download URL is required');
  console.error('═══════════════════════════════════════════════════════════\n');
  console.error('Usage: installer.exe <downloadUrl> [installPath]');
  console.error('       installer.exe --debug <downloadUrl> [installPath]');
  console.error('\nThis installer should be downloaded from the ABCD Tools website.');
  console.error('Please download it again from the installation page.\n');
  
  if (DEBUG) {
    console.error(`\nDebug log saved to: ${DEBUG_LOG_FILE}`);
  }
  
  // Pause before exiting
  if (process.platform === 'win32') {
    try {
      execSync('pause', { stdio: 'inherit' });
    } catch {
      setTimeout(() => process.exit(1), 5000);
    }
  }
  process.exit(1);
}

// Resolve environment variables in install path
function resolvePath(pathStr) {
  debugLog('Resolving path:', pathStr);
  const env = process.env;
  const resolved = pathStr
    .replace(/%LOCALAPPDATA%/g, env.LOCALAPPDATA || path.join(env.USERPROFILE, 'AppData', 'Local'))
    .replace(/%APPDATA%/g, env.APPDATA || path.join(env.USERPROFILE, 'AppData', 'Roaming'))
    .replace(/%USERPROFILE%/g, env.USERPROFILE || '');
  debugLog('Resolved path:', resolved);
  return resolved;
}

const resolvedInstallPath = resolvePath(installPath);
debugLog('Final resolved install path:', resolvedInstallPath);

console.log('═══════════════════════════════════════════════════════════');
console.log('ABCD Tools Installer');
console.log('═══════════════════════════════════════════════════════════\n');
console.log('Installation directory:', resolvedInstallPath);
console.log('Download URL:', downloadUrl);
console.log('');

async function downloadFile(url, destPath) {
  debugLog('Starting download:', { url, destPath });
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fsSync.createWriteStream(destPath);
    
    debugLog('Creating write stream to:', destPath);
    console.log('Downloading installer...');
    
    protocol.get(url, (response) => {
      debugLog('Download response:', {
        statusCode: response.statusCode,
        headers: response.headers,
        contentLength: response.headers['content-length'],
      });
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirect
        debugLog('Redirect detected:', response.headers.location);
        return downloadFile(response.headers.location, destPath)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        debugLog('Download failed with status:', response.statusCode);
        reject(new Error(`Download failed with status ${response.statusCode}`));
        return;
      }
      
      const totalSize = parseInt(response.headers['content-length'] || '0', 10);
      let downloadedSize = 0;
      debugLog('Download started:', { totalSize, totalSizeMB: (totalSize / 1024 / 1024).toFixed(2) });
      
      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        if (totalSize > 0) {
          const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
          process.stdout.write(`\rProgress: ${percent}% (${(downloadedSize / 1024 / 1024).toFixed(2)} MB / ${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
        }
        if (DEBUG && downloadedSize % (1024 * 1024) === 0) { // Log every MB
          debugLog(`Download progress: ${((downloadedSize / totalSize) * 100).toFixed(1)}%`);
        }
      });
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        debugLog('Download complete. File size:', downloadedSize, 'bytes');
        console.log('\nDownload complete!');
        resolve();
      });
      
      file.on('error', (err) => {
        debugLog('File write error:', err);
        fsSync.unlink(destPath, () => {}); // Delete file on error, ignore errors
        reject(err);
      });
    }).on('error', (err) => {
      debugLog('Download request error:', err);
      reject(err);
    });
  });
}

async function extractZip(zipPath, extractPath) {
  debugLog('Starting ZIP extraction:', { zipPath, extractPath });
  console.log('Extracting installer...');
  
  try {
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();
    debugLog('ZIP file contains', entries.length, 'entries');
    
    if (DEBUG) {
      entries.forEach((entry, index) => {
        debugLog(`Entry ${index + 1}:`, {
          name: entry.entryName,
          size: entry.header.size,
          isDirectory: entry.isDirectory,
        });
      });
    }
    
    zip.extractAllTo(extractPath, true);
    debugLog('ZIP extraction complete');
    console.log('Extraction complete!');
    return true;
  } catch (error) {
    debugLog('ZIP extraction error:', error);
    console.error('Extraction failed:', error.message);
    return false;
  }
}

// Function to pause and keep console open (Windows)
function pause() {
  if (process.platform === 'win32') {
    try {
      execSync('pause', { stdio: 'inherit' });
    } catch {
      // Fallback: wait 5 seconds
      console.log('\nWindow will close in 5 seconds...');
      setTimeout(() => {}, 5000);
    }
  }
}

async function main() {
  let errorOccurred = false;
  let errorMessage = '';
  
  debugLog('Main installation process started');
  
  try {
    // Create installation directory
    debugLog('Creating installation directory:', resolvedInstallPath);
    console.log('Creating installation directory...');
    await fs.mkdir(resolvedInstallPath, { recursive: true });
    debugLog('Installation directory created successfully');
    console.log('Directory created.\n');
    
    // Download ZIP to temp directory
    const tempDir = tmpdir();
    const zipPath = path.join(tempDir, 'ABCDToolsSetup.zip');
    debugLog('Temp directory:', tempDir);
    debugLog('ZIP download path:', zipPath);
    
    await downloadFile(downloadUrl, zipPath);
    console.log('');
    
    // Verify ZIP file exists and get size
    try {
      const zipStats = await fs.stat(zipPath);
      debugLog('Downloaded ZIP file size:', zipStats.size, 'bytes', `(${(zipStats.size / 1024 / 1024).toFixed(2)} MB)`);
    } catch (err) {
      debugLog('Failed to stat ZIP file:', err);
    }
    
    // Extract ZIP
    const extractSuccess = await extractZip(zipPath, resolvedInstallPath);
    
    if (!extractSuccess) {
      throw new Error('Failed to extract installer');
    }
    
    // Clean up ZIP file
    debugLog('Cleaning up ZIP file:', zipPath);
    try {
      await fs.unlink(zipPath);
      debugLog('ZIP file deleted successfully');
    } catch (err) {
      debugLog('Failed to delete ZIP file (non-critical):', err);
      // Ignore cleanup errors
    }
    
    // Verify installation
    const agentExe = path.join(resolvedInstallPath, 'agent.exe');
    const envFile = path.join(resolvedInstallPath, '.env');
    
    debugLog('Verifying installation files...');
    console.log('\nVerifying installation...');
    
    try {
      await fs.access(agentExe);
      debugLog('✓ agent.exe found at:', agentExe);
      console.log('✓ agent.exe found');
    } catch (err) {
      debugLog('⚠ agent.exe not found:', err);
      console.warn('⚠ agent.exe not found');
    }
    
    try {
      await fs.access(envFile);
      debugLog('✓ .env file found at:', envFile);
      console.log('✓ .env file found');
    } catch (err) {
      debugLog('⚠ .env file not found:', err);
      console.warn('⚠ .env file not found');
    }
    
    // List all extracted files in debug mode
    if (DEBUG) {
      try {
        const files = await fs.readdir(resolvedInstallPath, { recursive: true });
        debugLog('Extracted files:', files);
      } catch (err) {
        debugLog('Failed to list extracted files:', err);
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('Installation Complete!');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('Installation directory:', resolvedInstallPath);
    console.log('\nTo start the agent, run:');
    console.log(`  cd "${resolvedInstallPath}"`);
    console.log('  agent.exe');
    console.log('\nOr create a shortcut to:', agentExe);
    
  } catch (error) {
    errorOccurred = true;
    errorMessage = error.message;
    debugLog('ERROR occurred:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    console.error('\n═══════════════════════════════════════════════════════════');
    console.error('❌ Installation Failed!');
    console.error('═══════════════════════════════════════════════════════════\n');
    console.error('Error:', errorMessage);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    console.error('\nPlease try again or contact support.');
    console.error('You can also try downloading the ZIP file manually.');
    
    if (DEBUG) {
      console.error(`\nDebug log saved to: ${DEBUG_LOG_FILE}`);
      console.error('Please include this log file when contacting support.');
    }
  } finally {
    debugLog('Installation process finished. Error occurred:', errorOccurred);
    // Always pause before exiting so user can see the message
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('Press any key to exit...');
    pause();
    process.exit(errorOccurred ? 1 : 0);
  }
}

// Wrap in try-catch to catch any synchronous errors
try {
  main().catch((error) => {
    debugLog('FATAL ERROR (async):', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    console.error('\n❌ Fatal error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    if (DEBUG) {
      console.error(`\nDebug log saved to: ${DEBUG_LOG_FILE}`);
    }
    console.log('\nPress any key to exit...');
    pause();
    process.exit(1);
  });
} catch (error) {
  debugLog('FATAL ERROR (sync):', {
    message: error.message,
    stack: error.stack,
    name: error.name,
  });
  console.error('\n❌ Fatal error (synchronous):', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  if (DEBUG) {
    console.error(`\nDebug log saved to: ${DEBUG_LOG_FILE}`);
  }
  console.log('\nPress any key to exit...');
  pause();
  process.exit(1);
}

