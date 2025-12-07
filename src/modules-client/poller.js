/**
 * API polling logic for client agent
 */

import axios from 'axios';
import { config, getApiHeaders, validateConfig } from './config.js';
import { logger } from './logger.js';

/**
 * Test API connectivity with ping endpoint
 */
export async function pingApi() {
  const url = `${config.apiUrl}/ping`;
  const headers = getApiHeaders();
  
  logger.info(`[HTTP] GET ${url}`);
  logger.debug(`[HTTP] Headers:`, Object.keys(headers).map(k => `${k}: ${k === 'Authorization' ? 'Bearer ***' : headers[k]}`).join(', '));
  
  try {
    const response = await axios.get(url, { headers });
    
    logger.info(`[HTTP] GET ${url} → ${response.status} ${response.statusText}`);
    logger.debug(`[HTTP] Response data:`, response.data);
    
    if (response.data && response.data.status === 'ok') {
      logger.info('API ping successful');
      return true;
    }
    
    logger.warn('API ping returned unexpected response:', response.data);
    return false;
  } catch (error) {
    if (error.response) {
      logger.error(`[HTTP] GET ${url} → ${error.response.status} ${error.response.statusText}`);
      logger.error(`[HTTP] Error response:`, error.response.data);
    } else if (error.request) {
      logger.error(`[HTTP] GET ${url} → No response received`);
      logger.error(`[HTTP] Request error:`, error.message);
    } else {
      logger.error(`[HTTP] GET ${url} → Request setup error:`, error.message);
    }
    logger.error('Failed to ping API:', error.message);
    return false;
  }
}

/**
 * Poll for pending jobs from API
 */
export async function pollPendingJobs() {
  const url = `${config.apiUrl}/jobs/pending`;
  const headers = getApiHeaders();
  
  const startTime = Date.now();
  logger.debug(`[HTTP] GET ${url}`);
  
  try {
    const response = await axios.get(url, { headers });
    const duration = Date.now() - startTime;
    
    logger.debug(`[HTTP] GET ${url} → ${response.status} ${response.statusText} (${duration}ms)`);
    
    // Handle both response formats:
    // 1. New format: array directly [job1, job2, ...]
    // 2. Old format: { jobs: [job1, job2, ...], count: N }
    let jobs = [];
    if (response.data) {
      if (Array.isArray(response.data)) {
        // New format: array directly
        jobs = response.data;
      } else if (response.data.jobs && Array.isArray(response.data.jobs)) {
        // Old format: object with jobs property
        jobs = response.data.jobs;
        logger.debug(`   Received old response format, extracted ${jobs.length} job(s) from jobs property`);
      }
    }
    
    if (jobs.length > 0) {
      logger.info(`📋 Found ${jobs.length} pending job(s) - ready to process`);
      // Log job details
      jobs.forEach((job, idx) => {
        logger.info(`   Job ${idx + 1}: ${job.id} (${job.job_type || 'unknown'}) - ${job.status || 'queued'}`);
      });
    } else {
      logger.debug(`   No pending jobs available`);
    }
    
    return jobs;
  } catch (error) {
    const duration = Date.now() - startTime;
    if (error.response) {
      logger.error(`[HTTP] GET ${url} → ${error.response.status} ${error.response.statusText} (${duration}ms)`);
      logger.error(`[HTTP] Error response:`, error.response.data);
    } else if (error.request) {
      logger.error(`[HTTP] GET ${url} → No response received (${duration}ms)`);
      logger.error(`[HTTP] Network error:`, error.message);
    } else {
      logger.error(`[HTTP] GET ${url} → Request setup error (${duration}ms):`, error.message);
    }
    logger.error('❌ Failed to poll pending jobs:', error.message);
    return [];
  }
}

/**
 * Send heartbeat to API
 */
export async function sendHeartbeat() {
  const url = `${config.apiUrl}/heartbeat`;
  const headers = getApiHeaders();
  const data = {
    clientId: config.clientId,
    status: 'online',
    agentVersion: config.agentVersion,
  };
  
  try {
    const response = await axios.post(url, data, { headers });
    // Only log if there's an issue or in debug mode
    if (response.status !== 200) {
      logger.warn(`💓 Heartbeat: ${response.status} ${response.statusText}`);
    }
    return true;
  } catch (error) {
    if (error.response) {
      logger.error(`💓 Heartbeat failed: ${error.response.status} ${error.response.statusText}`);
      logger.error(`   Error:`, error.response.data);
    } else {
      logger.error(`💓 Heartbeat failed: ${error.message}`);
    }
    return false;
  }
}

/**
 * Update job status
 */
export async function updateJobStatus(jobId, status, results = null) {
  const url = `${config.apiUrl}/jobs/update`;
  const headers = getApiHeaders();
  const data = {
    jobId,
    status,
    results,
  };
  
  logger.debug(`[HTTP] POST ${url} (jobId: ${jobId}, status: ${status})`);
  
  try {
    const response = await axios.post(url, data, { headers });
    
    logger.debug(`[HTTP] POST ${url} → ${response.status} ${response.statusText}`);
    
    return true;
  } catch (error) {
    if (error.response) {
      logger.error(`[HTTP] POST ${url} → ${error.response.status} ${error.response.statusText}`);
      logger.error(`[HTTP] Error response:`, error.response.data);
    } else {
      logger.error(`[HTTP] POST ${url} → Request error:`, error.message);
    }
    logger.error(`Failed to update job ${jobId}:`, error.message);
    return false;
  }
}

/**
 * Submit execution report
 */
export async function submitExecutionReport(report) {
  const url = `${config.apiUrl}/execution-reports/submit`;
  const headers = getApiHeaders();
  
  logger.debug(`[HTTP] POST ${url}`);
  logger.debug(`[HTTP] Report size:`, JSON.stringify(report).length, 'bytes');
  
  try {
    const response = await axios.post(url, report, { headers });
    
    logger.debug(`[HTTP] POST ${url} → ${response.status} ${response.statusText}`);
    
    return true;
  } catch (error) {
    if (error.response) {
      logger.error(`[HTTP] POST ${url} → ${error.response.status} ${error.response.statusText}`);
      logger.error(`[HTTP] Error response:`, error.response.data);
    } else {
      logger.error(`[HTTP] POST ${url} → Request error:`, error.message);
    }
    logger.error('Failed to submit execution report:', error.message);
    return false;
  }
}

/**
 * Check if client is already registered
 * This actually calls registerClient() which will update if exists or create if doesn't exist
 */
export async function checkClientRegistration() {
  // Call registerClient() to check/ensure registration status
  // The register endpoint is idempotent - it updates if client exists, creates if it doesn't
  const registrationResult = await registerClient();
  
  if (registrationResult) {
    // Check the response message to determine if it was already registered or newly registered
    if (registrationResult.message === 'Client updated successfully') {
      logger.info('Client is already registered and was updated');
      return true;
    } else if (registrationResult.message === 'Client registered successfully') {
      logger.info('Client was newly registered');
      return true;
    } else {
      // Unknown response, but registration succeeded
      logger.info('Client registration check completed');
      return true;
    }
  }
  
  // Registration failed
  logger.debug('Client registration check failed');
  return false;
}

/**
 * Register client on first run
 */
export async function registerClient() {
  const url = `${config.apiUrl}/register`;
  const headers = getApiHeaders();
  
  // Always use process.cwd() as installPath - this is where the agent is actually running from
  // This ensures the server knows the exact installation directory
  const actualInstallPath = process.cwd();
  
  const requestData = {
    downloadToken: config.downloadToken,
    clientId: config.clientId,
    installPath: actualInstallPath, // Always send actual current working directory
    browserPath: config.browserPath,
    platform: 'windows',
    agentVersion: config.agentVersion,
  };
  
  logger.info(`[HTTP] POST ${url}`);
  logger.info(`[HTTP] Registering client with install path: ${actualInstallPath}`);
  logger.debug(`[HTTP] Request body:`, {
    downloadToken: requestData.downloadToken ? '***' : null,
    clientId: requestData.clientId,
    installPath: requestData.installPath,
    browserPath: requestData.browserPath,
    platform: requestData.platform,
    agentVersion: requestData.agentVersion,
  });
  logger.debug(`[HTTP] Headers:`, Object.keys(headers).map(k => `${k}: ${k === 'Authorization' ? 'Bearer ***' : headers[k]}`).join(', '));
  
  try {
    const response = await axios.post(url, requestData, { headers });
    
    logger.info(`[HTTP] POST ${url} → ${response.status} ${response.statusText}`);
    logger.info(`[HTTP] Response:`, response.data);
    logger.info('Client registered successfully');
    
    return response.data;
  } catch (error) {
    if (error.response) {
      logger.error(`[HTTP] POST ${url} → ${error.response.status} ${error.response.statusText}`);
      logger.error(`[HTTP] Error response:`, error.response.data);
      logger.error(`[HTTP] Error details:`, {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers,
      });
    } else if (error.request) {
      logger.error(`[HTTP] POST ${url} → No response received`);
      logger.error(`[HTTP] Request was made but no response received`);
      logger.error(`[HTTP] Request error:`, error.message);
    } else {
      logger.error(`[HTTP] POST ${url} → Request setup error:`, error.message);
    }
    logger.error('Failed to register client:', error.message);
    return null;
  }
}
