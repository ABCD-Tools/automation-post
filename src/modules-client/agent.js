/**
 * Main agent entry point
 * 
 * This is the entry point for the bundled agent.exe
 * It handles:
 * - Client registration on first run
 * - Polling for jobs
 * - Executing workflows
 * - Sending heartbeats
 */

import { config, validateConfig } from './config.js';
import { logger } from './logger.js';
import { pollPendingJobs, sendHeartbeat, updateJobStatus, registerClient } from './poller.js';
import { WorkflowExecutor } from './workflow-executor.js';
import puppeteer from 'puppeteer-core';
// Browser finder - will be available as browser.mjs in bundled package
// package.js copies browser.mjs to the bundled directory
// Try local import first (bundled), fallback to source (development)
let findChrome;
try {
  // Try bundled path (when running as agent.exe)
  const browserModule = await import('./browser.mjs');
  findChrome = browserModule.findChrome;
} catch {
  // Fallback to source path (development)
  try {
    const browserModule = await import('../modules-agents/utils/browser.mjs');
    findChrome = browserModule.findChrome;
  } catch (err) {
    // Last resort: use a simple finder
    findChrome = () => {
      throw new Error('Browser not found. Please set BROWSER_PATH in .env');
    };
  }
}
import fs from 'fs';
import { existsSync } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Lock file to prevent multiple instances
const LOCK_FILE = path.join(process.cwd(), '.agent.lock');

/**
 * Check if agent is already running
 */
function checkLockFile() {
  if (existsSync(LOCK_FILE)) {
    try {
      const lockData = fs.readFileSync(LOCK_FILE, 'utf-8');
      const lockInfo = JSON.parse(lockData);
      const pid = lockInfo.pid;
      
      // Check if process is still running (Windows)
      try {
        execSync(`tasklist /FI "PID eq ${pid}" 2>nul | find /I "${pid}" >nul`);
        logger.warn('Agent is already running (PID:', pid, ')');
        return true;
      } catch {
        // Process not running, remove stale lock file
        fs.unlinkSync(LOCK_FILE);
      }
    } catch {
      // Invalid lock file, remove it
      fs.unlinkSync(LOCK_FILE);
    }
  }
  
  return false;
}

/**
 * Create lock file
 */
function createLockFile() {
  const lockData = JSON.stringify({
    pid: process.pid,
    startedAt: new Date().toISOString(),
  });
  
  fs.writeFileSync(LOCK_FILE, lockData, 'utf-8');
}

/**
 * Remove lock file
 */
function removeLockFile() {
  if (existsSync(LOCK_FILE)) {
    try {
      fs.unlinkSync(LOCK_FILE);
    } catch (error) {
      logger.warn('Failed to remove lock file:', error.message);
    }
  }
}

/**
 * Handle protocol handler deep links
 */
function handleDeepLink() {
  const args = process.argv.slice(2);
  
  if (args.length > 0 && args[0].startsWith('abcdtools://')) {
    const url = args[0];
    logger.info('Received deep link:', url);
    
    // Parse deep link parameters
    const urlObj = new URL(url);
    const params = Object.fromEntries(urlObj.searchParams);
    
    logger.info('Deep link parameters:', params);
    
    // Handle different deep link actions
    if (urlObj.hostname === 'start' || params.action === 'start') {
      logger.info('Starting agent via deep link...');
      // Agent will start normally
    }
    
    return true;
  }
  
  return false;
}

/**
 * Execute a job workflow
 */
async function executeJob(job) {
  logger.info(`Executing job ${job.id}...`);
  
  // Update job status to processing
  await updateJobStatus(job.id, 'processing');
  
  let browser = null;
  let page = null;
  
  try {
    // Find browser
    let browserPath = config.browserPath;
    if (!browserPath || !existsSync(browserPath)) {
      browserPath = findChrome();
    }
    
    if (!browserPath || !existsSync(browserPath)) {
      throw new Error('Browser not found. Please set BROWSER_PATH in .env');
    }
    
    logger.info('Launching browser:', browserPath);
    
    // Launch browser
    browser = await puppeteer.launch({
      executablePath: browserPath,
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
    });
    
    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Create workflow executor
    const executor = new WorkflowExecutor(page, {
      screenshotOnError: true,
      screenshotDir: path.join(process.cwd(), 'screenshots'),
      enableRetry: true,
      maxRetries: 3,
    });
    
    // Get workflow from job content
    const workflow = job.content?.workflow || job.content;
    if (!workflow || !workflow.actions) {
      throw new Error('Invalid workflow in job content');
    }
    
    // Execute workflow
    logger.info(`Executing workflow with ${workflow.actions.length} actions...`);
    const result = await executor.executeWorkflow(workflow.actions, job.id);
    
    // Update job status
    if (result.success) {
      await updateJobStatus(job.id, 'completed', {
        success: true,
        results: result.results,
      });
      logger.info(`Job ${job.id} completed successfully`);
    } else {
      await updateJobStatus(job.id, 'failed', {
        success: false,
        error: result.error,
      });
      logger.error(`Job ${job.id} failed:`, result.error);
    }
    
  } catch (error) {
    logger.error(`Job ${job.id} execution error:`, error.message);
    await updateJobStatus(job.id, 'failed', {
      success: false,
      error: error.message,
    });
  } finally {
    // Close browser
    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        logger.warn('Error closing browser:', error.message);
      }
    }
  }
}

/**
 * Main polling loop
 */
async function startPolling() {
  logger.info('Starting polling loop...');
  logger.info(`Polling interval: ${config.pollingInterval}ms`);
  
  let lastJobTime = Date.now();
  let consecutiveEmptyPolls = 0;
  
  while (true) {
    try {
      // Send heartbeat
      await sendHeartbeat();
      
      // Poll for pending jobs
      const jobs = await pollPendingJobs();
      
      if (jobs.length > 0) {
        logger.info(`Found ${jobs.length} pending job(s)`);
        lastJobTime = Date.now();
        consecutiveEmptyPolls = 0;
        
        // Process up to maxJobsPerCycle jobs
        const jobsToProcess = jobs.slice(0, config.maxJobsPerCycle);
        
        for (const job of jobsToProcess) {
          await executeJob(job);
        }
      } else {
        consecutiveEmptyPolls++;
        logger.debug('No pending jobs');
        
        // Check if idle timeout reached
        const idleTime = Date.now() - lastJobTime;
        if (idleTime >= config.idleTimeout) {
          logger.info('Idle timeout reached. Stopping agent...');
          break;
        }
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, config.pollingInterval));
      
    } catch (error) {
      logger.error('Polling error:', error.message);
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, config.pollingInterval));
    }
  }
}

/**
 * Main entry point
 */
async function main() {
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info('ABCD Tools Client Agent');
  logger.info(`Version: ${config.agentVersion}`);
  logger.info('═══════════════════════════════════════════════════════════\n');
  
  // Handle deep link if provided
  handleDeepLink();
  
  // Check if already running
  if (checkLockFile()) {
    logger.error('Agent is already running. Exiting...');
    process.exit(1);
  }
  
  // Create lock file
  createLockFile();
  
  // Validate configuration
  const validation = validateConfig();
  if (!validation.valid) {
    logger.error('Configuration validation failed:');
    validation.errors.forEach(error => logger.error('  -', error));
    logger.error('\nPlease check your .env file and ensure all required variables are set.');
    removeLockFile();
    process.exit(1);
  }
  
  // Register client on first run (if download token exists)
  if (config.downloadToken) {
    logger.info('Registering client...');
    const registration = await registerClient();
    if (!registration) {
      logger.warn('Client registration failed, but continuing...');
    }
  } else if (!config.clientId) {
    logger.error('CLIENT_ID is required. Please reinstall the agent.');
    removeLockFile();
    process.exit(1);
  }
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    logger.info('\nReceived SIGINT. Shutting down gracefully...');
    removeLockFile();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    logger.info('\nReceived SIGTERM. Shutting down gracefully...');
    removeLockFile();
    process.exit(0);
  });
  
  // Start polling
  try {
    await startPolling();
  } catch (error) {
    logger.error('Fatal error:', error);
  } finally {
    removeLockFile();
    logger.info('Agent stopped.');
    process.exit(0);
  }
}

// Run main function
main().catch(error => {
  logger.error('Unhandled error:', error);
  removeLockFile();
  process.exit(1);
});
