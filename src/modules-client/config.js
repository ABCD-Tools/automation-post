import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from the same directory as agent.exe
const envPath = join(process.cwd(), '.env');

if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  // Try parent directory (for development)
  const parentEnvPath = join(process.cwd(), '..', '.env');
  if (existsSync(parentEnvPath)) {
    dotenv.config({ path: parentEnvPath });
  }
}

/**
 * Normalize PEM key format - ensure proper newlines
 * Handles keys that may have been stored with escaped newlines or without proper formatting
 * @param {string} key - PEM key string
 * @returns {string} Normalized PEM key with proper newlines
 */
function normalizePEMKey(key) {
  if (!key) return '';
  
  // If already properly formatted, return as-is
  if (key.includes('\n') && key.includes('-----BEGIN') && key.includes('-----END')) {
    return key;
  }
  
  // Replace escaped newlines
  key = key.replace(/\\n/g, '\n');
  
  // If key doesn't have newlines but has BEGIN/END markers, try to reconstruct
  if (key.includes('-----BEGIN') && key.includes('-----END') && !key.includes('\n')) {
    // This shouldn't happen with proper PEM format, but handle it
    key = key.replace(/-----BEGIN/g, '\n-----BEGIN').replace(/-----END/g, '-----END\n');
  }
  
  // Ensure proper line endings
  return key.trim();
}

/**
 * Client configuration loaded from .env
 */
export const config = {
  // API Configuration
  apiUrl: process.env.CLIENT_API_URL || process.env.API_URL || 'http://localhost:3000/api/client',
  apiToken: process.env.API_TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  
  // Encryption Keys (local only, never sent to server)
  // Normalize PEM keys - dotenv may not preserve newlines correctly
  encryptionKey: normalizePEMKey(process.env.ENCRYPTION_KEY || ''),
  decryptionKey: normalizePEMKey(process.env.DECRYPTION_KEY || ''),
  
  // Browser Configuration
  browserPath: process.env.BROWSER_PATH || '',
  
  // Agent Settings
  logLevel: process.env.LOG_LEVEL || 'info',
  pollingInterval: parseInt(process.env.POLLING_INTERVAL || '10000', 10), // 10 seconds default
  maxJobsPerCycle: parseInt(process.env.MAX_JOBS_PER_CYCLE || '5', 10),
  idleTimeout: parseInt(process.env.IDLE_TIMEOUT || '300000', 10), // 5 minutes default
  
  // Installation
  downloadToken: process.env.DOWNLOAD_TOKEN || '',
  // Always use process.cwd() as installPath - this is where the agent is actually running from
  installPath: process.cwd(),
  
  // Agent Version
  agentVersion: process.env.AGENT_VERSION || '1.0.0',
};

/**
 * Validate required configuration
 */
export function validateConfig() {
  const errors = [];
  
  if (!config.apiUrl) {
    errors.push('CLIENT_API_URL is required');
  }
  
  if (!config.apiToken) {
    errors.push('API_TOKEN is required');
  }
  
  if (!config.clientId) {
    errors.push('CLIENT_ID is required');
  }
  
  if (!config.browserPath) {
    errors.push('BROWSER_PATH is required');
  }
  
  if (!config.encryptionKey || !config.decryptionKey) {
    errors.push('ENCRYPTION_KEY and DECRYPTION_KEY are required');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get API headers for requests
 */
export function getApiHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiToken}`,
    'X-Client-ID': config.clientId,
  };
}
