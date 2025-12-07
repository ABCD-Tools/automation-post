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
    
    if (response.data && Array.isArray(response.data)) {
      if (response.data.length > 0) {
        logger.info(`📋 Found ${response.data.length} pending job(s) - ready to process`);
        // Log job details
        response.data.forEach((job, idx) => {
          logger.info(`   Job ${idx + 1}: ${job.id} (${job.job_type || 'unknown'}) - ${job.status || 'queued'}`);
        });
      } else {
        logger.debug(`   No pending jobs available`);
      }
      return response.data;
    }
    
    logger.warn(`   Unexpected response format:`, response.data);
    return [];
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
 */
export async function checkClientRegistration() {
  // Try to ping the API - if it works, client is registered
  const pingResult = await pingApi();
  if (pingResult) {
    logger.info('Client is already registered and connected');
    return true;
  }
  
  // If ping fails, check if it's an auth error (client exists but wrong token)
  // or network error (client might not exist)
  logger.debug('Client registration status unknown - ping failed');
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
