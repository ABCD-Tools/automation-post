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
import { pollPendingJobs, sendHeartbeat, updateJobStatus, registerClient, pingApi, checkClientRegistration } from './poller.js';
import { WorkflowExecutor } from './workflow-executor.js';
import puppeteer from 'puppeteer-core';
import { PLATFORM_CONFIG } from '../modules-agents/platforms/platform.js';
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
 * Configure viewport based on workflow platform
 * @param {Object} page - Puppeteer page instance
 * @param {string} platform - Platform name (instagram, facebook, twitter, etc.)
 */
async function configureViewport(page, platform) {
  const platformConfig = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.default;
  
  if (platformConfig.useMobileViewport) {
    logger.info(`📱 Configuring mobile viewport for ${platform}`);
    await page.emulate({
      name: 'iPhone 12',
      viewport: {
        width: 390,
        height: 844,
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    });
    
    // Verify viewport was set correctly
    const viewport = await page.viewport();
    logger.info(`   Viewport set to: ${viewport.width}x${viewport.height} (mobile)`);
  } else {
    logger.info(`🖥️  Configuring desktop viewport for ${platform}`);
    await page.setViewport({ width: 1280, height: 720 });
    
    // Verify viewport was set correctly
    const viewport = await page.viewport();
    logger.info(`   Viewport set to: ${viewport.width}x${viewport.height} (desktop)`);
  }
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
    // Get workflow from job content (needed for platform detection)
    let workflow = job.content?.workflow || job.content;
    
    if (!workflow) {
      logger.error(`Job ${job.id} has no workflow in content. Content keys:`, Object.keys(job.content || {}));
      throw new Error('Invalid workflow in job content: workflow is missing');
    }
    
    // Extract platform for viewport configuration
    const platform = workflow?.platform || 'default';
    logger.info(`Platform detected: ${platform}`);
    
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
    
    // Configure viewport based on platform (mobile for Instagram/Facebook, desktop for others)
    await configureViewport(page, platform);
    
    // Create workflow executor
    const executor = new WorkflowExecutor(page, {
      screenshotOnError: true,
      screenshotDir: path.join(process.cwd(), 'screenshots'),
      enableRetry: true,
      maxRetries: 3,
    });
    
    if (!workflow) {
      logger.error(`Job ${job.id} has no workflow in content. Content keys:`, Object.keys(job.content || {}));
      throw new Error('Invalid workflow in job content: workflow is missing');
    }
    
    // Handle both formats: actions array (execution format) or steps array (database format)
    if (!workflow.actions) {
      // Parse steps if it's a string (JSONB fields might be returned as strings)
      let steps = workflow.steps;
      if (steps && typeof steps === 'string') {
        try {
          steps = JSON.parse(steps);
          workflow.steps = steps;
        } catch (parseError) {
          logger.error(`Failed to parse workflow steps as JSON:`, parseError.message);
          throw new Error(`Invalid workflow format: steps is not valid JSON`);
        }
      }
      
      // Try to convert from database format (steps) to execution format (actions)
      if (workflow.steps && Array.isArray(workflow.steps)) {
        logger.warn(`Job ${job.id} workflow is in database format (steps). Attempting conversion...`);
        
        try {
          // Convert steps to actions
          const actions = workflow.steps.map((step, index) => {
            const microAction = step.micro_action;
            
            if (!microAction) {
              throw new Error(
                `Step ${index + 1} (micro_action_id: ${step.micro_action_id}) is missing micro_action data. ` +
                'Workflow must be loaded with micro_actions populated.'
              );
            }
            
            const baseParams = microAction.params || {};
            const stepOverrides = step.params_override || {};
            const finalParams = { ...baseParams, ...stepOverrides };
            
            const visual = finalParams.visual || microAction.visual || null;
            const backupSelector = finalParams.backup_selector || microAction.backup_selector || null;
            const executionMethod = finalParams.execution_method || microAction.execution_method || 'visual_first';
            
            const action = {
              name: microAction.name || step.name || `Action ${index + 1}`,
              type: microAction.type || step.type,
              params: finalParams,
            };
            
            if (visual) action.visual = visual;
            if (backupSelector) action.backup_selector = backupSelector;
            if (executionMethod) action.execution_method = executionMethod;
            
            return action;
          });
          
          workflow = {
            id: workflow.id,
            name: workflow.name,
            platform: workflow.platform,
            type: workflow.type,
            actions: actions,
          };
          
          logger.info(`Successfully converted workflow from steps format (${workflow.steps.length} steps → ${actions.length} actions)`);
        } catch (conversionError) {
          logger.error(`Failed to convert workflow from steps format:`, conversionError.message);
          logger.error(`Workflow structure:`, JSON.stringify({
            hasSteps: !!workflow.steps,
            stepsLength: workflow.steps?.length,
            stepSample: workflow.steps?.[0] ? {
              hasMicroAction: !!workflow.steps[0].micro_action,
              microActionId: workflow.steps[0].micro_action_id,
            } : null,
          }, null, 2));
          throw new Error(`Invalid workflow format: ${conversionError.message}`);
        }
      } else {
        // Neither actions nor steps - invalid format
        logger.error(`Job ${job.id} workflow has invalid format. Expected 'actions' or 'steps' array.`);
        logger.error(`Workflow structure:`, JSON.stringify({
          hasActions: !!workflow.actions,
          hasSteps: !!workflow.steps,
          workflowKeys: Object.keys(workflow),
        }, null, 2));
        throw new Error('Invalid workflow in job content: missing actions or steps array');
      }
    }
    
    if (!workflow.actions || !Array.isArray(workflow.actions) || workflow.actions.length === 0) {
      logger.error(`Job ${job.id} workflow has no valid actions array`);
      throw new Error('Invalid workflow in job content: actions array is missing or empty');
    }
    
    // Execute workflow
    logger.info(`Executing workflow "${workflow.name || workflow.id}" with ${workflow.actions.length} action(s)...`);
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
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info('🔄 Starting polling loop...');
  logger.info(`   Polling interval: ${config.pollingInterval}ms (${config.pollingInterval / 1000}s)`);
  logger.info(`   Max jobs per cycle: ${config.maxJobsPerCycle}`);
  logger.info(`   Idle timeout: ${config.idleTimeout}ms (${config.idleTimeout / 1000 / 60} minutes)`);
  logger.info('═══════════════════════════════════════════════════════════\n');
  
  let lastJobTime = Date.now();
  let consecutiveEmptyPolls = 0;
  let totalPolls = 0;
  let totalJobsProcessed = 0;
  const pollStartTime = Date.now();
  
  while (true) {
    try {
      totalPolls++;
      const pollCycleStart = Date.now();
      
      // Send heartbeat
      const heartbeatStart = Date.now();
      await sendHeartbeat();
      const heartbeatDuration = Date.now() - heartbeatStart;
      if (heartbeatDuration > 1000) {
        logger.debug(`💓 Heartbeat sent (${heartbeatDuration}ms)`);
      }
      
      // Poll for pending jobs
      const jobs = await pollPendingJobs();
      const pollDuration = Date.now() - pollCycleStart;
      
      if (jobs.length > 0) {
        logger.info(`\n📦 Processing ${jobs.length} job(s) from queue`);
        lastJobTime = Date.now();
        consecutiveEmptyPolls = 0;
        
        // Process up to maxJobsPerCycle jobs
        const jobsToProcess = jobs.slice(0, config.maxJobsPerCycle);
        const skippedJobs = jobs.length - jobsToProcess.length;
        
        if (skippedJobs > 0) {
          logger.info(`   ⚠️  ${skippedJobs} job(s) will be processed in next cycle (max ${config.maxJobsPerCycle} per cycle)`);
        }
        
        for (let i = 0; i < jobsToProcess.length; i++) {
          const job = jobsToProcess[i];
          logger.info(`\n   [${i + 1}/${jobsToProcess.length}] Processing job: ${job.id}`);
          logger.info(`      Type: ${job.job_type || 'unknown'}, Status: ${job.status || 'queued'}`);
          await executeJob(job);
          totalJobsProcessed++;
        }
        
        logger.info(`\n✅ Cycle complete: Processed ${jobsToProcess.length} job(s) in ${pollDuration}ms`);
      } else {
        consecutiveEmptyPolls++;
        const idleTime = Date.now() - lastJobTime;
        const idleMinutes = Math.floor(idleTime / 60000);
        const idleSeconds = Math.floor((idleTime % 60000) / 1000);
        
        // Log every 10 polls or every minute
        if (consecutiveEmptyPolls % 10 === 0 || pollDuration > 1000) {
          logger.info(`🔍 Poll #${totalPolls}: No pending jobs (idle: ${idleMinutes}m ${idleSeconds}s, poll took ${pollDuration}ms)`);
        } else {
          logger.debug(`   Poll #${totalPolls}: No jobs available (${pollDuration}ms)`);
        }
        
        // Check if idle timeout reached
        if (idleTime >= config.idleTimeout) {
          const totalUptime = Date.now() - pollStartTime;
          const uptimeMinutes = Math.floor(totalUptime / 60000);
          logger.info('\n═══════════════════════════════════════════════════════════');
          logger.info('⏸️  Idle timeout reached. Stopping agent...');
          logger.info(`   Total polls: ${totalPolls}`);
          logger.info(`   Jobs processed: ${totalJobsProcessed}`);
          logger.info(`   Uptime: ${uptimeMinutes} minutes`);
          logger.info('═══════════════════════════════════════════════════════════');
          break;
        }
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, config.pollingInterval));
      
    } catch (error) {
      logger.error('\n❌ Polling error:', error.message);
      logger.error('   Stack:', error.stack);
      logger.info('   Retrying in next cycle...');
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
  
  // Check if client is already registered
  logger.info('Checking client registration status...');
  logger.debug(`Download token present: ${config.downloadToken ? 'Yes' : 'No'}`);
  logger.debug(`Client ID present: ${config.clientId ? 'Yes' : 'No'}`);
  logger.debug(`API URL: ${config.apiUrl}`);
  
  // First, try to ping API to check if already registered
  const isRegistered = await checkClientRegistration();
  
  if (!isRegistered && config.downloadToken) {
    logger.info('Download token found - attempting client registration...');
    const registration = await registerClient();
    if (!registration) {
      logger.warn('Client registration failed, but continuing...');
    } else {
      logger.info('Client registration completed successfully');
    }
  } else if (!isRegistered && !config.clientId) {
    logger.error('CLIENT_ID is required. Please reinstall the agent.');
    logger.error('No download token found and no CLIENT_ID configured.');
    removeLockFile();
    process.exit(1);
  } else if (isRegistered) {
    logger.info('Client is already registered. Skipping registration.');
  } else {
    logger.info('No download token found, but CLIENT_ID exists - skipping registration');
    logger.info('Client should already be registered. Continuing with existing client ID...');
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

  // Test API connectivity before starting polling
  logger.info('Testing API connectivity...');
  const pingSuccess = await pingApi();
  if (!pingSuccess) {
    logger.error('API ping failed. Please check your API_URL and network connection.');
    logger.error('Agent will not start without API connectivity.');
    removeLockFile();
    process.exit(1);
  }

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
