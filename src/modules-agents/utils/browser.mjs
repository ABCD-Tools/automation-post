// Browser finder utility
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Find Chrome/Chromium executable path
 * @returns {string} Path to Chrome executable
 * @throws {Error} If Chrome is not found
 */
export function findChrome() {
  const platform = process.platform;
  const possiblePaths = [];

  if (platform === 'win32') {
    // Windows paths
    const winPaths = [
      process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
      process.env.PROGRAMFILES + '\\Google\\Chrome\\Application\\chrome.exe',
      process.env['PROGRAMFILES(X86)'] + '\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA + '\\Chromium\\Application\\chromium.exe',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];
    possiblePaths.push(...winPaths);
  } else if (platform === 'darwin') {
    // macOS paths
    possiblePaths.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      process.env.HOME + '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    );
  } else {
    // Linux paths
    possiblePaths.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
    );
  }

  // Check each path
  for (const chromePath of possiblePaths) {
    if (chromePath && existsSync(chromePath)) {
      return chromePath;
    }
  }

  // Try to find via command
  try {
    if (platform === 'win32') {
      const result = execSync('where chrome', { encoding: 'utf8', stdio: 'pipe' }).trim();
      if (result && existsSync(result)) {
        return result;
      }
    } else {
      const result = execSync('which google-chrome || which chromium || which chromium-browser', {
        encoding: 'utf8',
        stdio: 'pipe',
        shell: '/bin/bash',
      }).trim();
      if (result && existsSync(result)) {
        return result;
      }
    }
  } catch (error) {
    // Command failed, continue to throw error
  }

  throw new Error(
    'Chrome/Chromium not found. Please install Google Chrome or Chromium browser.',
  );
}

