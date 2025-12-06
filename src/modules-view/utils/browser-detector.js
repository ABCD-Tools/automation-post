/**
 * Browser Detection Utility
 * 
 * Auto-detect Chrome/Edge location in browser (client-side)
 * Returns: { found: boolean, path: string, browser: 'chrome'|'edge'|null }
 */

/**
 * Detect Chrome installation
 * Note: This is a client-side utility, but browser detection
 * must be done server-side or via a browser extension.
 * For now, this provides a helper for the UI to guide users.
 */
export function detectChrome() {
  // Client-side detection is limited - we can only check common paths
  // via a browser extension or server-side API
  // For now, return common paths for user reference
  
  const commonPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '%LOCALAPPDATA%\\Google\\Chrome\\Application\\chrome.exe',
  ];
  
  return {
    found: false, // Cannot detect from browser
    paths: commonPaths,
    browser: 'chrome',
  };
}

/**
 * Detect Edge installation
 */
export function detectEdge() {
  const commonPaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  
  return {
    found: false, // Cannot detect from browser
    paths: commonPaths,
    browser: 'edge',
  };
}

/**
 * Try Chrome first, then Edge
 */
export function detectBrowser() {
  const chrome = detectChrome();
  const edge = detectEdge();
  
  return {
    found: false, // Client-side detection not possible
    chrome,
    edge,
    message: 'Please use the "Browse" button to select your browser executable, or use the auto-detect feature (requires server-side API).',
  };
}

/**
 * Validate browser path
 */
export function validateBrowserPath(path) {
  if (!path) {
    return { valid: false, error: 'Browser path is required' };
  }
  
  if (!path.endsWith('.exe')) {
    return { valid: false, error: 'Browser path must end with .exe' };
  }
  
  // Check if it's a Chrome or Edge executable
  const isChrome = path.toLowerCase().includes('chrome') && path.toLowerCase().includes('chrome.exe');
  const isEdge = path.toLowerCase().includes('edge') && path.toLowerCase().includes('msedge.exe');
  
  if (!isChrome && !isEdge) {
    return { valid: false, error: 'Path must point to Chrome or Edge executable' };
  }
  
  return { valid: true };
}

