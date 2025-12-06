// Abstract agent class

import puppeteer from 'puppeteer-core';
import { findChrome } from '../utils/browser.mjs';
import { applyAllStealth } from '../utils/stealth.js';
import { randomDelay, humanType, humanScroll } from '../utils/human-behavior.js';
import { WorkflowExecutor } from '../../modules-client/workflow-executor.js';
import { EnhancedVisualExecutor } from '../../modules-client/enhanced-visual-executor.js';
import { WorkflowStorage } from '../../modules-client/workflow-storage.js';
import { existsSync } from 'fs';
import axios from 'axios';

/**
 * Base Agent - Abstract base class for all platform agents
 * 
 * Provides:
 * - Browser initialization with stealth
 * - Common methods (navigate, wait, etc.)
 * - Session management (cookies, storage)
 * - Error handling and retry logic
 * - Integration with WorkflowExecutor and VisualExecutor
 */
export class BaseAgent {
  constructor(options = {}) {
    this.options = {
      headless: options.headless !== undefined ? options.headless : false,
      stealth: options.stealth !== undefined ? options.stealth : true,
      humanBehavior: options.humanBehavior !== undefined ? options.humanBehavior : true,
      userDataDir: options.userDataDir || null,
      viewport: options.viewport || { width: 1920, height: 1080 },
      timeout: options.timeout || 30000,
      browserPath: options.browserPath || null,
      workflowSource: options.workflowSource || 'file', // 'database' | 'file' | 'api'
      workflowDir: options.workflowDir || './workflows',
      apiUrl: options.apiUrl || null,
      apiToken: options.apiToken || null,
      ...options,
    };
    
    this.browser = null;
    this.page = null;
    this.workflowExecutor = null;
    this.visualExecutor = null;
    this.isInitialized = false;
    this.sessionData = null;
    this.platform = options.platform || 'all';
    this.workflowStorage = new WorkflowStorage(this.options.workflowDir);
    this.workflowCache = new Map(); // Cache loaded workflows
  }
  
  /**
   * Initialize browser and apply stealth
   */
  async init() {
    if (this.isInitialized) {
      return;
    }
    
    // Find browser path
    let browserPath = this.options.browserPath;
    if (!browserPath || !existsSync(browserPath)) {
      browserPath = findChrome();
    }
    
    if (!browserPath || !existsSync(browserPath)) {
      throw new Error('Browser not found. Please set browserPath in options or BROWSER_PATH in .env');
    }
    
    // Launch browser
    const launchOptions = {
      executablePath: browserPath,
      headless: this.options.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    };
    
    if (this.options.userDataDir) {
      launchOptions.userDataDir = this.options.userDataDir;
    }
    
    this.browser = await puppeteer.launch(launchOptions);
    this.page = await this.browser.newPage();
    
    // Set viewport
    await this.page.setViewport(this.options.viewport);
    
    // Apply stealth techniques
    if (this.options.stealth) {
      await applyAllStealth(this.page);
    }
    
    // Initialize executors
    this.visualExecutor = new EnhancedVisualExecutor(this.page, {
      screenshotOnError: true,
      enableRetry: true,
      maxRetries: 3,
    });
    
    this.workflowExecutor = new WorkflowExecutor(this.page, {
      screenshotOnError: true,
      enableRetry: true,
      maxRetries: 3,
    });
    
    this.isInitialized = true;
  }
  
  /**
   * Navigate to URL with human-like delays
   * @param {string} url - URL to navigate to
   * @param {Object} options - Navigation options
   */
  async navigate(url, options = {}) {
    if (!this.isInitialized) {
      await this.init();
    }
    
    await this.page.goto(url, {
      waitUntil: options.waitUntil || 'networkidle2',
      timeout: this.options.timeout,
    });
    
    if (this.options.humanBehavior) {
      await randomDelay(1000, 2000);
    }
  }
  
  /**
   * Wait for page to be ready
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState?.('networkidle') || 
          this.page.waitForFunction(() => document.readyState === 'complete');
  }
  
  /**
   * Load workflow by type from database, API, or file system
   * @param {string} type - Workflow type (auth, post, like, etc.)
   * @param {Object} options - Load options
   * @returns {Promise<Object>} Workflow object with actions
   */
  async loadWorkflow(type, options = {}) {
    const cacheKey = `${this.platform}_${type}`;
    
    // Check cache first
    if (this.workflowCache.has(cacheKey)) {
      return this.workflowCache.get(cacheKey);
    }
    
    let workflow = null;
    
    // Load from database via API
    if (this.options.workflowSource === 'api' || this.options.workflowSource === 'database') {
      if (!this.options.apiUrl) {
        throw new Error('API URL required for database workflow loading');
      }
      
      try {
        // Use the list endpoint and get the first active workflow
        const response = await axios.get(
          `${this.options.apiUrl}/admin/workflows/list`,
          {
            params: {
              platform: this.platform,
              type: type,
              page: 1,
              limit: 1,
            },
            headers: this.options.apiToken ? {
              'Authorization': `Bearer ${this.options.apiToken}`,
            } : {},
          }
        );
        
        if (response.data && response.data.workflows && response.data.workflows.length > 0) {
          // Get the first active workflow
          const dbWorkflow = response.data.workflows.find(w => w.is_active) || response.data.workflows[0];
          workflow = this.convertWorkflowToActions(dbWorkflow);
        }
      } catch (error) {
        console.warn(`Failed to load workflow from API: ${error.message}`);
      }
    }
    
    // Fallback to file system
    if (!workflow && (this.options.workflowSource === 'file' || !workflow)) {
      try {
        const filename = `${this.platform}_${type}`;
        workflow = await this.workflowStorage.loadWorkflow(filename);
      } catch (error) {
        // Try alternative naming
        try {
          const filename = `${type}`;
          workflow = await this.workflowStorage.loadWorkflow(filename);
        } catch (err) {
          console.warn(`Failed to load workflow from file: ${err.message}`);
        }
      }
    }
    
    if (!workflow || !workflow.actions) {
      throw new Error(`Workflow not found: platform=${this.platform}, type=${type}`);
    }
    
    // Cache workflow
    this.workflowCache.set(cacheKey, workflow);
    
    return workflow;
  }
  
  /**
   * Convert database workflow format to actions array
   * @param {Object} workflow - Database workflow object
   * @returns {Object} Workflow with actions array
   */
  convertWorkflowToActions(workflow) {
    if (!workflow.steps || !Array.isArray(workflow.steps)) {
      throw new Error('Invalid workflow: missing steps');
    }
    
    // Convert steps (with micro_actions) to actions array
    const actions = workflow.steps.map((step) => {
      const microAction = step.micro_action || step;
      const params = { ...microAction.params, ...step.params_override };
      
      return {
        name: microAction.name || step.name,
        type: microAction.type || step.type,
        params: params,
        visual: params.visual,
        backup_selector: params.backup_selector,
      };
    });
    
    return {
      id: workflow.id,
      name: workflow.name,
      platform: workflow.platform,
      type: workflow.type,
      actions: actions,
    };
  }
  
  /**
   * Run workflow by type (convenience method)
   * @param {string} type - Workflow type (auth, post, like, etc.)
   * @param {Object} variables - Template variables
   * @returns {Promise<Object>} Execution result
   */
  async runWorkflow(type, variables = {}) {
    const workflow = await this.loadWorkflow(type);
    return await this.executeWorkflow(workflow.actions, variables);
  }
  
  /**
   * Save session (cookies and storage)
   * @returns {Promise<Object>} Session data
   */
  async saveSession() {
    if (!this.page) {
      throw new Error('Page not initialized');
    }
    
    const cookies = await this.page.cookies();
    const storage = await this.page.evaluate(() => {
      return {
        localStorage: { ...localStorage },
        sessionStorage: { ...sessionStorage },
      };
    });
    
    this.sessionData = {
      cookies,
      storage,
      url: this.page.url(),
      timestamp: new Date().toISOString(),
    };
    
    return this.sessionData;
  }
  
  /**
   * Load session (cookies and storage)
   * @param {Object} sessionData - Session data from saveSession()
   */
  async loadSession(sessionData) {
    if (!this.page) {
      await this.init();
    }
    
    if (sessionData.cookies && sessionData.cookies.length > 0) {
      await this.page.setCookie(...sessionData.cookies);
    }
    
    if (sessionData.url) {
      await this.navigate(sessionData.url);
    }
    
    if (sessionData.storage) {
      await this.page.evaluate((storage) => {
        if (storage.localStorage) {
          for (const [key, value] of Object.entries(storage.localStorage)) {
            localStorage.setItem(key, value);
          }
        }
        if (storage.sessionStorage) {
          for (const [key, value] of Object.entries(storage.sessionStorage)) {
            sessionStorage.setItem(key, value);
          }
        }
      }, sessionData.storage);
    }
  }
  
  /**
   * Execute workflow using WorkflowExecutor
   * @param {Array} actions - Workflow actions
   * @param {Object} variables - Template variables
   * @returns {Promise<Object>} Execution result
   */
  async executeWorkflow(actions, variables = {}) {
    if (!this.workflowExecutor) {
      await this.init();
    }
    
    this.workflowExecutor.setVariables(variables);
    return await this.workflowExecutor.executeWorkflow(actions);
  }
  
  /**
   * Execute single action using VisualExecutor
   * @param {Object} action - Action to execute
   * @returns {Promise<Object>} Execution result
   */
  async executeAction(action) {
    if (!this.visualExecutor) {
      await this.init();
    }
    
    return await this.visualExecutor.executeAction(action);
  }
  
  /**
   * Type text with human-like behavior
   * @param {string} selector - Element selector
   * @param {string} text - Text to type
   */
  async type(selector, text) {
    if (this.options.humanBehavior) {
      await humanType(this.page, selector, text);
    } else {
      await this.page.type(selector, text);
    }
  }
  
  /**
   * Click element
   * @param {string} selector - Element selector
   */
  async click(selector) {
    await this.page.click(selector);
    if (this.options.humanBehavior) {
      await randomDelay(300, 800);
    }
  }
  
  /**
   * Scroll page
   * @param {string} direction - 'up' or 'down'
   * @param {number} amount - Scroll amount
   */
  async scroll(direction = 'down', amount = null) {
    if (this.options.humanBehavior) {
      await humanScroll(this.page, direction, amount);
    } else {
      await this.page.evaluate((dir, amt) => {
        window.scrollBy(0, dir === 'down' ? (amt || 300) : -(amt || 300));
      }, direction, amount);
    }
  }
  
  /**
   * Wait for element
   * @param {string} selector - Element selector
   * @param {Object} options - Wait options
   */
  async waitForSelector(selector, options = {}) {
    return await this.page.waitForSelector(selector, {
      timeout: this.options.timeout,
      ...options,
    });
  }
  
  /**
   * Take screenshot
   * @param {string} path - Screenshot path
   * @param {Object} options - Screenshot options
   */
  async screenshot(path, options = {}) {
    return await this.page.screenshot({
      path,
      fullPage: options.fullPage || false,
      ...options,
    });
  }
  
  /**
   * Close browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.isInitialized = false;
    }
  }
  
  /**
   * Get current URL
   */
  get url() {
    return this.page?.url() || null;
  }
  
  /**
   * Get page title
   */
  async getTitle() {
    return await this.page?.title() || null;
  }
}
