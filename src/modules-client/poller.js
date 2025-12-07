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
  try {
    const response = await axios.get(
      `${config.apiUrl}/ping`,
      { headers: getApiHeaders() }
    );
    
    if (response.data && response.data.status === 'ok') {
      logger.info('API ping successful');
      return true;
    }
    
    logger.warn('API ping returned unexpected response:', response.data);
    return false;
  } catch (error) {
    logger.error('Failed to ping API:', error.message);
    if (error.response) {
      logger.error('Response status:', error.response.status);
      logger.error('Response data:', error.response.data);
    }
    return false;
  }
}

/**
 * Poll for pending jobs from API
 */
export async function pollPendingJobs() {
  try {
    const response = await axios.get(
      `${config.apiUrl}/jobs/pending`,
      { headers: getApiHeaders() }
    );
    
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    
    return [];
  } catch (error) {
    logger.error('Failed to poll pending jobs:', error.message);
    if (error.response) {
      logger.error('Response status:', error.response.status);
      logger.error('Response data:', error.response.data);
    }
    return [];
  }
}

/**
 * Send heartbeat to API
 */
export async function sendHeartbeat() {
  try {
    await axios.post(
      `${config.apiUrl}/heartbeat`,
      {
        clientId: config.clientId,
        status: 'online',
        agentVersion: config.agentVersion,
      },
      { headers: getApiHeaders() }
    );
    
    return true;
  } catch (error) {
    logger.error('Failed to send heartbeat:', error.message);
    return false;
  }
}

/**
 * Update job status
 */
export async function updateJobStatus(jobId, status, results = null) {
  try {
    await axios.post(
      `${config.apiUrl}/jobs/update`,
      {
        jobId,
        status,
        results,
      },
      { headers: getApiHeaders() }
    );
    
    return true;
  } catch (error) {
    logger.error(`Failed to update job ${jobId}:`, error.message);
    return false;
  }
}

/**
 * Submit execution report
 */
export async function submitExecutionReport(report) {
  try {
    await axios.post(
      `${config.apiUrl}/execution-reports/submit`,
      report,
      { headers: getApiHeaders() }
    );
    
    return true;
  } catch (error) {
    logger.error('Failed to submit execution report:', error.message);
    return false;
  }
}

/**
 * Register client on first run
 */
export async function registerClient() {
  try {
    const response = await axios.post(
      `${config.apiUrl}/register`,
      {
        downloadToken: config.downloadToken,
        clientId: config.clientId,
        installPath: config.installPath,
        browserPath: config.browserPath,
        platform: 'windows',
        agentVersion: config.agentVersion,
      },
      { headers: getApiHeaders() }
    );
    
    logger.info('Client registered successfully');
    return response.data;
  } catch (error) {
    logger.error('Failed to register client:', error.message);
    if (error.response) {
      logger.error('Response:', error.response.data);
    }
    return null;
  }
}
