/**
 * Simple file logger for client agent
 */

import fs from 'fs';
import path from 'path';
import { config } from './config.js';

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const LOG_DIR = path.join(process.cwd(), 'logs');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const LOG_FILE = path.join(LOG_DIR, `agent-${new Date().toISOString().split('T')[0]}.log`);

function getLogLevel() {
  return LOG_LEVELS[config.logLevel] || LOG_LEVELS.info;
}

function formatMessage(level, message, ...args) {
  const timestamp = new Date().toISOString();
  const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ') : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${formattedArgs}\n`;
}

function writeLog(level, message, ...args) {
  const logLevel = getLogLevel();
  const levelNum = LOG_LEVELS[level];
  
  if (levelNum <= logLevel) {
    const formatted = formatMessage(level, message, ...args);
    
    // Console output
    if (level === 'error') {
      console.error(formatted.trim());
    } else if (level === 'warn') {
      console.warn(formatted.trim());
    } else {
      console.log(formatted.trim());
    }
    
    // File output
    try {
      fs.appendFileSync(LOG_FILE, formatted, 'utf-8');
    } catch (error) {
      // Silently fail if log file can't be written
    }
  }
}

export const logger = {
  error: (message, ...args) => writeLog('error', message, ...args),
  warn: (message, ...args) => writeLog('warn', message, ...args),
  info: (message, ...args) => writeLog('info', message, ...args),
  debug: (message, ...args) => writeLog('debug', message, ...args),
};
