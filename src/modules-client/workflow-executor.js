import { EnhancedVisualExecutor } from './enhanced-visual-executor.js';
import { ActionTypes, replaceTemplates, estimateExecutionTime } from './action-types.js';
import fs from 'fs';
import path from 'path';

/**
 * WorkflowExecutor - Executes complete workflows (sequences of actions)
 * 
 * Features:
 * - Sequential action execution
 * - Template variable replacement
 * - Error handling and recovery
 * - Progress tracking with detailed logging
 * - Execution statistics with method tracking
 * - Enhanced retry logic with progressive threshold relaxation
 * - Breakpoint support
 * - Execution reports with confidence scores
 * - Detailed error logging with screenshots
 * - Database integration for report storage
 */
export class WorkflowExecutor {
  constructor(page, options = {}) {
    this.page = page;
    
    // Use EnhancedVisualExecutor with progressive retry logic (Phase 7.1 Part 2)
    this.visualExecutor = new EnhancedVisualExecutor(page, {
      screenshotOnError: options.screenshotOnError !== false,
      screenshotDir: options.screenshotDir || './screenshots',
      enableRetry: options.enableRetry !== false,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      relaxThresholdsOnRetry: true, // Enable progressive relaxation
      initialPositionTolerance: 15,
      relaxedPositionTolerance: 30,
      initialSimilarityThreshold: 0.7,
      relaxedSimilarityThreshold: 0.5,
      trackPerformance: true,
      saveDebugScreenshots: options.saveDebugScreenshots || false
    });
    
    // Configuration
    this.options = {
      retryOnFailure: options.retryOnFailure !== false, // Default: true
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000, // 1 second
      stopOnError: options.stopOnError !== false, // Default: true
      logProgress: options.logProgress !== false, // Default: true
      delayBetweenActions: options.delayBetweenActions || 1000, // 1 second
      randomizeDelay: options.randomizeDelay !== false, // Default: true
      ...options,
    };

    // State
    this.variables = {};
    this.currentActionIndex = 0;
    this.executionResults = [];
    this.breakpoints = new Set();
    this.isPaused = false;
    this.isStopped = false;
    
    // Visual Debug Mode (Phase 7.3)
    this.debugMode = options.debug || options.debugMode || false;
    this.debugScreenshots = [];
    this.debugDir = options.debugDir || './logs/debug';
    
    // Create debug directory if in debug mode
    if (this.debugMode && !fs.existsSync(this.debugDir)) {
      fs.mkdirSync(this.debugDir, { recursive: true });
    }
    
    // Execution report tracking (Phase 7.2)
    this.executionReport = {
      workflowId: null,
      startTime: null,
      endTime: null,
      duration: 0,
      actions: [],
      methodStats: {
        selector: { count: 0, totalTime: 0 },
        text: { count: 0, totalTime: 0 },
        visual: { count: 0, totalTime: 0 },
        position: { count: 0, totalTime: 0 },
        failed: { count: 0, totalTime: 0 }
      },
      overallStats: {
        total: 0,
        successful: 0,
        failed: 0,
        successRate: 0,
        averageTime: 0,
        averageConfidence: 0
      },
      errors: []
    };
    
    // Error logging directory
    this.errorLogDir = options.errorLogDir || './logs/errors';
    if (!fs.existsSync(this.errorLogDir)) {
      fs.mkdirSync(this.errorLogDir, { recursive: true });
    }
  }

  /**
   * Set template variables for the workflow
   * @param {Object} variables - Template variables (username, password, etc.)
   */
  setVariables(variables) {
    this.variables = { ...this.variables, ...variables };
  }

  /**
   * Add a breakpoint at specific action index
   * @param {number} index - Action index to pause at
   */
  addBreakpoint(index) {
    this.breakpoints.add(index);
  }

  /**
   * Remove a breakpoint
   * @param {number} index - Action index
   */
  removeBreakpoint(index) {
    this.breakpoints.delete(index);
  }

  /**
   * Clear all breakpoints
   */
  clearBreakpoints() {
    this.breakpoints.clear();
  }

  /**
   * Pause execution (resume with resume())
   */
  pause() {
    this.isPaused = true;
  }

  /**
   * Resume execution after pause
   */
  resume() {
    this.isPaused = false;
  }

  /**
   * Stop execution completely
   */
  stop() {
    this.isStopped = true;
  }

  /**
   * Execute a complete workflow
   * @param {Array} actions - Array of actions to execute
   * @param {string} workflowId - Optional workflow ID for reporting
   * @returns {Promise<Object>} Execution results with detailed report
   */
  async executeWorkflow(actions, workflowId = null) {
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║        WORKFLOW EXECUTION STARTED             ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    const startTime = Date.now();
    this.currentActionIndex = 0;
    this.executionResults = [];
    this.isStopped = false;
    
    // Initialize execution report
    this.executionReport = {
      workflowId: workflowId || `workflow_${Date.now()}`,
      startTime: new Date().toISOString(),
      endTime: null,
      duration: 0,
      actions: [],
      methodStats: {
        selector: { count: 0, totalTime: 0 },
        text: { count: 0, totalTime: 0 },
        visual: { count: 0, totalTime: 0 },
        position: { count: 0, totalTime: 0 },
        failed: { count: 0, totalTime: 0 }
      },
      overallStats: {
        total: 0,
        successful: 0,
        failed: 0,
        successRate: 0,
        averageTime: 0,
        averageConfidence: 0
      },
      errors: []
    };

    // Log workflow summary
    if (this.options.logProgress) {
      console.log(`📋 Workflow: ${actions.length} actions`);
      console.log(`⏱️  Estimated time: ${this.estimateWorkflowTime(actions)}ms`);
      console.log(`🔧 Configuration:`, {
        retryOnFailure: this.options.retryOnFailure,
        maxRetries: this.options.maxRetries,
        stopOnError: this.options.stopOnError,
      });
      console.log('');
    }

    // Execute each action
    for (let i = 0; i < actions.length; i++) {
      // Check if stopped
      if (this.isStopped) {
        console.log('\n⏹️  Workflow stopped by user');
        break;
      }

      // Check breakpoint
      if (this.breakpoints.has(i)) {
        console.log(`\n🔴 Breakpoint at action ${i + 1}`);
        this.isPaused = true;
      }

      // Wait if paused
      while (this.isPaused && !this.isStopped) {
        await this.sleep(100);
      }

      this.currentActionIndex = i;
      const action = actions[i];

      // Log progress
      if (this.options.logProgress) {
        console.log(`\n[${i + 1}/${actions.length}] ${action.name}`);
        console.log('─'.repeat(50));
      }

      // Replace template variables
      const processedAction = replaceTemplates(action, this.variables);

      // Debug Mode: Capture BEFORE screenshot (Phase 7.3)
      let beforeScreenshot = null;
      if (this.debugMode) {
        beforeScreenshot = await this.captureDebugScreenshot(i, 'before', action.name);
      }

      // Execute action with retry logic and detailed tracking
      const actionStartTime = Date.now();
      const result = await this.executeActionWithRetry(processedAction);
      const actionEndTime = Date.now();
      const actionDuration = actionEndTime - actionStartTime;
      
      // Debug Mode: Capture AFTER screenshot (Phase 7.3)
      let afterScreenshot = null;
      if (this.debugMode) {
        afterScreenshot = await this.captureDebugScreenshot(i, 'after', action.name);
        
        // Add debug info to result
        this.debugScreenshots.push({
          actionIndex: i,
          actionName: action.name,
          actionType: action.type,
          before: beforeScreenshot,
          after: afterScreenshot,
          success: result.success,
          method: result.method,
          duration: actionDuration,
          confidence: result.confidence || null,
          error: result.error || null
        });
      }

      // Create detailed action report
      const actionReport = {
        index: i,
        name: action.name,
        type: action.type,
        success: result.success,
        method: result.method,
        duration: actionDuration,
        retries: result.retries || 0,
        confidence: result.confidence || null,
        timestamp: new Date().toISOString(),
        error: result.error || null,
        errorDetails: result.errorDetails || null
      };
      
      // Add to execution report
      this.executionReport.actions.push(actionReport);
      
      // Update method stats
      if (result.method && this.executionReport.methodStats[result.method]) {
        this.executionReport.methodStats[result.method].count++;
        this.executionReport.methodStats[result.method].totalTime += actionDuration;
      }
      
      // Track errors with detailed information
      if (!result.success) {
        await this.logDetailedError(action, result, i);
      }

      // Store result (legacy format)
      this.executionResults.push({
        index: i,
        action: action.name,
        ...result,
        timestamp: Date.now(),
      });

      // Log result
      if (this.options.logProgress) {
        if (result.success) {
          const confidenceStr = result.confidence 
            ? ` confidence: ${(result.confidence * 100).toFixed(1)}%` 
            : '';
          console.log(`✅ Success (method: ${result.method}, time: ${actionDuration}ms, retries: ${result.retries || 0}${confidenceStr})`);
        } else {
          console.log(`❌ Failed: ${result.error}`);
        }
      }

      // Stop on error if configured
      if (!result.success && this.options.stopOnError) {
        console.log('\n⚠️  Stopping workflow due to error (stopOnError: true)');
        break;
      }

      // Delay between actions (except after last action)
      if (i < actions.length - 1 && action.type !== ActionTypes.WAIT) {
        await this.delayBetweenActions();
      }
    }

    // Calculate statistics
    const endTime = Date.now();
    const duration = endTime - startTime;
    const stats = this.calculateStats();
    
    // Finalize execution report
    this.executionReport.endTime = new Date().toISOString();
    this.executionReport.duration = duration;
    this.executionReport.overallStats = {
      total: this.executionReport.actions.length,
      successful: this.executionReport.actions.filter(a => a.success).length,
      failed: this.executionReport.actions.filter(a => !a.success).length,
      successRate: parseFloat(stats.successRate),
      averageTime: stats.averageTime,
      averageConfidence: this.calculateAverageConfidence()
    };

    // Generate debug report if in debug mode (Phase 7.3)
    if (this.debugMode && this.debugScreenshots.length > 0) {
      const debugReportPath = path.join(this.debugDir, `debug_report_${Date.now()}.html`);
      await this.generateDebugReport(debugReportPath);
    }

    // Log summary
    if (this.options.logProgress) {
      console.log('\n╔═══════════════════════════════════════════════╗');
      console.log('║        WORKFLOW EXECUTION COMPLETE            ║');
      console.log('╚═══════════════════════════════════════════════╝\n');

      console.log('📊 Execution Summary:');
      console.log(`   Total actions: ${stats.total}`);
      console.log(`   Successful: ${stats.successful} ✅`);
      console.log(`   Failed: ${stats.failed} ❌`);
      console.log(`   Success rate: ${stats.successRate}%`);
      console.log(`   Duration: ${duration}ms (${(duration / 1000).toFixed(1)}s)`);
      console.log(`   Average per action: ${stats.averageTime}ms`);
      console.log(`   Average confidence: ${(this.executionReport.overallStats.averageConfidence * 100).toFixed(1)}%\n`);

      console.log('🔍 Method Breakdown:');
      Object.entries(this.executionReport.methodStats).forEach(([method, stats]) => {
        if (stats.count > 0) {
          const avgTime = (stats.totalTime / stats.count).toFixed(0);
          console.log(`   ${method}: ${stats.count} actions (avg: ${avgTime}ms)`);
        }
      });
      console.log('');

      console.log('🔍 Enhanced Visual Executor Stats:');
      const enhancedStats = this.visualExecutor.getEnhancedStats();
      console.log(`   Selector-based: ${enhancedStats.enhanced.methodBreakdown.selector || 0}`);
      console.log(`   Text-based: ${enhancedStats.enhanced.methodBreakdown.text || 0}`);
      console.log(`   Visual-based: ${enhancedStats.enhanced.methodBreakdown.visual || 0}`);
      console.log(`   Position-based: ${enhancedStats.enhanced.methodBreakdown.position || 0}`);
      console.log(`   Retried actions: ${enhancedStats.enhanced.retriedActions}`);
      console.log(`   Success rate: ${enhancedStats.enhanced.successRate}`);
      console.log(`   Avg performance: ${enhancedStats.enhanced.performance.average}ms\n`);
    }

    return {
      success: stats.failed === 0,
      duration,
      results: this.executionResults,
      stats,
      visualStats: this.visualExecutor.getStats(),
      enhancedStats: this.visualExecutor.getEnhancedStats(), // Phase 7.1 Part 2: Enhanced stats
      executionReport: this.executionReport, // Phase 7.2: Include detailed report
    };
  }

  /**
   * Execute a single action with retry logic
   * @param {Object} action - Action to execute
   * @returns {Promise<Object>} Execution result
   */
  async executeActionWithRetry(action) {
    let lastError = null;
    let retries = 0;

    while (retries <= this.options.maxRetries) {
      try {
        const result = await this.executeSingleAction(action);

        if (result.success) {
          return { ...result, retries };
        }

        lastError = result.error;

        // Retry if configured
        if (this.options.retryOnFailure && retries < this.options.maxRetries) {
          console.log(`   ⚠️  Retry ${retries + 1}/${this.options.maxRetries} after ${this.options.retryDelay}ms...`);
          await this.sleep(this.options.retryDelay);
          retries++;
          continue;
        }

        return { ...result, retries };

      } catch (error) {
        lastError = error.message;
        
        if (this.options.retryOnFailure && retries < this.options.maxRetries) {
          console.log(`   ⚠️  Error: ${error.message}`);
          console.log(`   ⚠️  Retry ${retries + 1}/${this.options.maxRetries} after ${this.options.retryDelay}ms...`);
          await this.sleep(this.options.retryDelay);
          retries++;
          continue;
        }

        return {
          success: false,
          method: 'error',
          error: error.message,
          retries,
        };
      }
    }

    return {
      success: false,
      method: 'error',
      error: lastError || 'Max retries exceeded',
      retries,
    };
  }

  /**
   * Execute a single action (no retry logic)
   * @param {Object} action - Action to execute
   * @returns {Promise<Object>} Execution result
   */
  async executeSingleAction(action) {
    switch (action.type) {
      case ActionTypes.NAVIGATE: {
        await this.page.goto(action.params.url, {
          waitUntil: action.params.waitUntil || 'networkidle2',
          timeout: 30000,
        });
        return { success: true, method: 'navigation' };
      }

      case ActionTypes.WAIT: {
        let duration = action.params.duration;
        if (action.params.randomize) {
          const variation = duration * 0.2; // ±20%
          duration = duration + (Math.random() * variation * 2 - variation);
        }
        await this.sleep(Math.round(duration));
        return { success: true, method: 'wait' };
      }

      case ActionTypes.SCREENSHOT: {
        await this.page.screenshot({
          path: action.params.path,
          fullPage: action.params.fullPage || false,
        });
        return { success: true, method: 'screenshot' };
      }

      case ActionTypes.SCROLL: {
        await this.page.evaluate((params) => {
          if (params.direction === 'down') {
            window.scrollBy(0, params.amount || window.innerHeight);
          } else if (params.direction === 'up') {
            window.scrollBy(0, -(params.amount || window.innerHeight));
          }
        }, action.params);
        return { success: true, method: 'scroll' };
      }

      case ActionTypes.CLICK:
      case ActionTypes.TYPE:
      case ActionTypes.UPLOAD: {
        // Delegate to visual executor
        return await this.visualExecutor.executeAction(action);
      }

      default: {
        return {
          success: false,
          method: 'unknown',
          error: `Unknown action type: ${action.type}`,
        };
      }
    }
  }

  /**
   * Delay between actions with optional randomization
   */
  async delayBetweenActions() {
    let delay = this.options.delayBetweenActions;
    
    if (this.options.randomizeDelay) {
      const variation = delay * 0.3; // ±30%
      delay = delay + (Math.random() * variation * 2 - variation);
    }
    
    await this.sleep(Math.round(delay));
  }

  /**
   * Sleep for specified duration
   * @param {number} ms - Milliseconds to sleep
   */
  async sleep(ms) {
    await this.page.waitForTimeout(ms);
  }

  /**
   * Estimate total workflow execution time
   * @param {Array} actions - Workflow actions
   * @returns {number} Estimated time in milliseconds
   */
  estimateWorkflowTime(actions) {
    let total = 0;
    
    for (const action of actions) {
      total += estimateExecutionTime(action);
      
      // Add delay between actions
      if (action.type !== ActionTypes.WAIT) {
        total += this.options.delayBetweenActions;
      }
    }
    
    return Math.round(total);
  }

  /**
   * Calculate execution statistics
   * @returns {Object} Statistics
   */
  calculateStats() {
    const total = this.executionResults.length;
    const successful = this.executionResults.filter((r) => r.success).length;
    const failed = total - successful;
    
    const times = this.executionResults
      .filter((r) => r.timestamp)
      .map((r, i, arr) => {
        if (i === 0) return 0;
        return r.timestamp - arr[i - 1].timestamp;
      })
      .filter((t) => t > 0);
    
    const averageTime = times.length > 0
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      : 0;
    
    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? ((successful / total) * 100).toFixed(1) : '0.0',
      averageTime,
    };
  }

  /**
   * Get current execution progress
   * @returns {Object} Progress information
   */
  getProgress() {
    return {
      currentIndex: this.currentActionIndex,
      totalActions: this.executionResults.length,
      isPaused: this.isPaused,
      isStopped: this.isStopped,
    };
  }

  /**
   * Get execution results
   * @returns {Array} Execution results
   */
  getResults() {
    return this.executionResults;
  }

  /**
   * Reset executor state
   */
  reset() {
    this.currentActionIndex = 0;
    this.executionResults = [];
    this.isPaused = false;
    this.isStopped = false;
    this.visualExecutor.resetStats();
  }

  /**
   * Enable debug mode
   * @param {boolean} enabled - Debug mode enabled
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    this.visualExecutor.setDebugMode(enabled);
    
    // Create debug directory if enabling
    if (enabled && !fs.existsSync(this.debugDir)) {
      fs.mkdirSync(this.debugDir, { recursive: true });
    }
  }
  
  /**
   * Capture debug screenshot (Phase 7.3)
   * @param {number} actionIndex - Action index
   * @param {string} timing - 'before' or 'after'
   * @param {string} actionName - Action name for filename
   * @returns {Promise<string>} Screenshot path
   */
  async captureDebugScreenshot(actionIndex, timing, actionName) {
    try {
      const timestamp = Date.now();
      const sanitizedName = actionName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `action_${actionIndex}_${timing}_${sanitizedName}_${timestamp}.png`;
      const filepath = path.join(this.debugDir, filename);
      
      await this.page.screenshot({
        path: filepath,
        fullPage: false
      });
      
      return filepath;
    } catch (error) {
      console.log(`   ⚠️  Could not capture debug screenshot: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Highlight element with red border (Phase 7.3)
   * @param {Object} selector - Element selector or coordinates
   * @returns {Promise<void>}
   */
  async highlightElement(selector) {
    try {
      await this.page.evaluate((sel) => {
        let element = null;
        
        // Try to find element by selector
        if (typeof sel === 'string') {
          element = document.querySelector(sel);
        } else if (sel && sel.x !== undefined && sel.y !== undefined) {
          // Find element by position
          element = document.elementFromPoint(sel.x, sel.y);
        }
        
        if (element) {
          // Add red border highlight
          element.style.outline = '3px solid red';
          element.style.outlineOffset = '2px';
          element.style.boxShadow = '0 0 10px rgba(255, 0, 0, 0.5)';
          
          // Remove highlight after 2 seconds
          setTimeout(() => {
            element.style.outline = '';
            element.style.outlineOffset = '';
            element.style.boxShadow = '';
          }, 2000);
        }
      }, selector);
    } catch (error) {
      console.log(`   ⚠️  Could not highlight element: ${error.message}`);
    }
  }
  
  /**
   * Generate HTML debug report (Phase 7.3)
   * @param {string} outputPath - Path to save HTML file
   * @returns {Promise<boolean>} Success status
   */
  async generateDebugReport(outputPath) {
    try {
      const report = this.executionReport;
      
      // Build HTML content
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Debug Report - ${report.workflowId}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            padding: 20px;
            color: #333;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        .header {
            background: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header h1 { font-size: 28px; margin-bottom: 10px; }
        .header .meta { color: #666; font-size: 14px; }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-card .label { font-size: 12px; color: #666; text-transform: uppercase; }
        .stat-card .value { font-size: 32px; font-weight: bold; margin-top: 5px; }
        .stat-card.success .value { color: #10b981; }
        .stat-card.error .value { color: #ef4444; }
        .stat-card.time .value { color: #3b82f6; }
        .actions { display: flex; flex-direction: column; gap: 20px; }
        .action-card {
            background: white;
            border-radius: 8px;
            padding: 25px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .action-card.failed { border-left: 4px solid #ef4444; }
        .action-card.success { border-left: 4px solid #10b981; }
        .action-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
        }
        .action-title { font-size: 18px; font-weight: 600; }
        .action-meta { font-size: 13px; color: #666; margin-top: 5px; }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
        }
        .badge.success { background: #d1fae5; color: #065f46; }
        .badge.error { background: #fee2e2; color: #991b1b; }
        .badge.method { background: #dbeafe; color: #1e40af; }
        .screenshots {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-top: 15px;
        }
        .screenshot-box {
            text-align: center;
        }
        .screenshot-box h4 {
            font-size: 13px;
            color: #666;
            margin-bottom: 8px;
            text-transform: uppercase;
        }
        .screenshot-box img {
            width: 100%;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            cursor: pointer;
            transition: transform 0.2s;
        }
        .screenshot-box img:hover {
            transform: scale(1.02);
        }
        .error-details {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 6px;
            padding: 15px;
            margin-top: 15px;
        }
        .error-details h4 {
            color: #991b1b;
            margin-bottom: 8px;
            font-size: 14px;
        }
        .error-details pre {
            font-size: 12px;
            color: #666;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .confidence {
            display: inline-block;
            font-size: 13px;
            font-weight: 500;
            color: #059669;
        }
    </style>
</head>
<body>
    <div className="container">
        <div className="header">
            <h1>🔍 Debug Report</h1>
            <div className="meta">
                <strong>Workflow:</strong> ${report.workflowId}<br>
                <strong>Started:</strong> ${report.startTime}<br>
                <strong>Duration:</strong> ${(report.duration / 1000).toFixed(2)}s
            </div>
        </div>

        <div className="stats">
            <div className="stat-card success">
                <div className="label">Success Rate</div>
                <div className="value">${report.overallStats.successRate}%</div>
            </div>
            <div className="stat-card">
                <div className="label">Total Actions</div>
                <div className="value">${report.overallStats.total}</div>
            </div>
            <div className="stat-card error">
                <div className="label">Failed</div>
                <div className="value">${report.overallStats.failed}</div>
            </div>
            <div className="stat-card time">
                <div className="label">Avg Time</div>
                <div className="value">${report.overallStats.averageTime}ms</div>
            </div>
            <div className="stat-card">
                <div className="label">Avg Confidence</div>
                <div className="value">${(report.overallStats.averageConfidence * 100).toFixed(1)}%</div>
            </div>
        </div>

        <div className="actions">
            ${this.debugScreenshots.map((debug, idx) => `
                <div className="action-card ${debug.success ? 'success' : 'failed'}">
                    <div className="action-header">
                        <div>
                            <div className="action-title">${idx + 1}. ${debug.actionName}</div>
                            <div className="action-meta">
                                Type: ${debug.actionType} • 
                                Method: ${debug.method} • 
                                Duration: ${debug.duration}ms
                                ${debug.confidence ? ` • Confidence: <span className="confidence">${(debug.confidence * 100).toFixed(1)}%</span>` : ''}
                            </div>
                        </div>
                        <div>
                            <span className="badge ${debug.success ? 'success' : 'error'}">
                                ${debug.success ? '✓ Success' : '✗ Failed'}
                            </span>
                            <span className="badge method">${debug.method}</span>
                        </div>
                    </div>

                    ${debug.before || debug.after ? `
                        <div className="screenshots">
                            ${debug.before ? `
                                <div className="screenshot-box">
                                    <h4>Before</h4>
                                    <img src="${path.relative(path.dirname(outputPath), debug.before)}" 
                                         alt="Before screenshot"
                                         onclick="window.open(this.src, '_blank')">
                                </div>
                            ` : ''}
                            ${debug.after ? `
                                <div className="screenshot-box">
                                    <h4>After</h4>
                                    <img src="${path.relative(path.dirname(outputPath), debug.after)}" 
                                         alt="After screenshot"
                                         onclick="window.open(this.src, '_blank')">
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}

                    ${debug.error ? `
                        <div className="error-details">
                            <h4>⚠️ Error Details</h4>
                            <pre>${debug.error}</pre>
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>

        <div style="text-align: center; margin-top: 40px; color: #999; font-size: 13px;">
            Generated on ${new Date().toLocaleString()}
        </div>
    </div>
</body>
</html>
      `.trim();
      
      // Write HTML file
      const reportDir = path.dirname(outputPath);
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }
      
      fs.writeFileSync(outputPath, html);
      console.log(`\n📄 Debug report generated: ${outputPath}`);
      
      return true;
    } catch (error) {
      console.error(`\n❌ Failed to generate debug report: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Get debug screenshots
   * @returns {Array} Debug screenshots array
   */
  getDebugScreenshots() {
    return this.debugScreenshots;
  }
  
  /**
   * Log detailed error information (Phase 7.1)
   * @param {Object} action - The action that failed
   * @param {Object} result - The execution result
   * @param {number} actionIndex - Action index in workflow
   */
  async logDetailedError(action, result, actionIndex) {
    const errorTimestamp = Date.now();
    const errorId = `error_${errorTimestamp}`;
    
    // Capture current page state
    let pageState = null;
    let errorScreenshot = null;
    
    try {
      // Get page information
      pageState = await this.page.evaluate(() => {
        return {
          url: window.location.href,
          title: document.title,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          elementCount: document.querySelectorAll('*').length,
          visibleText: document.body.innerText.substring(0, 500)
        };
      });
      
      // Capture screenshot
      const screenshotPath = path.join(this.errorLogDir, `${errorId}.png`);
      await this.page.screenshot({ path: screenshotPath, fullPage: false });
      errorScreenshot = screenshotPath;
      
    } catch (captureError) {
      console.log(`   ⚠️  Could not capture error details: ${captureError.message}`);
    }
    
    // Build detailed error object
    const errorDetails = {
      errorId,
      timestamp: new Date(errorTimestamp).toISOString(),
      actionIndex,
      actionName: action.name,
      actionType: action.type,
      error: result.error,
      method: result.method,
      retries: result.retries || 0,
      
      // What was searched for
      searchCriteria: {
        text: action.params?.visual?.text || null,
        position: action.params?.visual?.position || null,
        selector: action.params?.backup_selector || null,
        screenshot: action.params?.visual?.screenshot ? '[base64 data]' : null
      },
      
      // Page state when error occurred
      pageState,
      
      // Screenshot path
      errorScreenshot,
      
      // Additional context
      visual: action.params?.visual ? {
        hasScreenshot: !!action.params.visual.screenshot,
        hasPosition: !!action.params.visual.position,
        hasText: !!action.params.visual.text,
        boundingBox: action.params.visual.boundingBox || null
      } : null
    };
    
    // Add to execution report
    this.executionReport.errors.push(errorDetails);
    
    // Log detailed error
    if (this.options.logProgress) {
      console.log(`\n   🔍 Detailed Error Information:`);
      console.log(`   ├─ Error ID: ${errorId}`);
      console.log(`   ├─ Action: ${action.name} (${action.type})`);
      console.log(`   ├─ Method tried: ${result.method}`);
      
      if (errorDetails.searchCriteria.text) {
        console.log(`   ├─ Searched for text: "${errorDetails.searchCriteria.text}"`);
      }
      if (errorDetails.searchCriteria.position) {
        console.log(`   ├─ Position: (${errorDetails.searchCriteria.position.relative?.x}%, ${errorDetails.searchCriteria.position.relative?.y}%)`);
      }
      if (errorDetails.searchCriteria.selector) {
        console.log(`   ├─ Selector: ${errorDetails.searchCriteria.selector}`);
      }
      
      if (pageState) {
        console.log(`   ├─ Current page: ${pageState.url}`);
        console.log(`   ├─ Elements on page: ${pageState.elementCount}`);
      }
      
      if (errorScreenshot) {
        console.log(`   └─ Screenshot saved: ${errorScreenshot}`);
      }
    }
    
    // Save error log to file
    try {
      const errorLogPath = path.join(this.errorLogDir, `${errorId}.json`);
      fs.writeFileSync(errorLogPath, JSON.stringify(errorDetails, null, 2));
    } catch (writeError) {
      console.log(`   ⚠️  Could not save error log: ${writeError.message}`);
    }
  }
  
  /**
   * Calculate average confidence score from successful actions
   * @returns {number} Average confidence (0-1)
   */
  calculateAverageConfidence() {
    const actionsWithConfidence = this.executionReport.actions.filter(
      a => a.success && a.confidence !== null && a.confidence !== undefined
    );
    
    if (actionsWithConfidence.length === 0) {
      return 0;
    }
    
    const totalConfidence = actionsWithConfidence.reduce((sum, a) => sum + a.confidence, 0);
    return totalConfidence / actionsWithConfidence.length;
  }
  
  /**
   * Get execution report (Phase 7.2)
   * @returns {Object} Detailed execution report
   */
  getExecutionReport() {
    return this.executionReport;
  }
  
  /**
   * Export execution report to JSON file
   * @param {string} filepath - Path to save the report
   */
  async exportExecutionReport(filepath) {
    try {
      const reportDir = path.dirname(filepath);
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }
      
      fs.writeFileSync(filepath, JSON.stringify(this.executionReport, null, 2));
      console.log(`\n📄 Execution report saved to: ${filepath}`);
      return true;
    } catch (error) {
      console.error(`\n❌ Failed to export execution report: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Save execution report to database (Phase 7.2 Part 2)
   * @param {Object} supabase - Supabase client instance
   * @param {Object} metadata - Additional metadata (jobId, workflowId, userId, etc.)
   * @returns {Promise<Object>} Database insert result
   */
  async saveReportToDatabase(supabase, metadata = {}) {
    try {
      const report = this.executionReport;
      
      // Prepare report for database
      const dbReport = {
        // Relationships
        job_id: metadata.jobId || null,
        workflow_id: metadata.workflowId || null,
        user_id: metadata.userId || null,
        
        // Workflow info
        workflow_name: metadata.workflowName || report.workflowId,
        workflow_type: metadata.workflowType || null,
        platform: metadata.platform || null,
        
        // Timing
        start_time: report.startTime,
        end_time: report.endTime,
        duration: report.duration,
        
        // Overall statistics
        total_actions: report.overallStats.total,
        successful_actions: report.overallStats.successful,
        failed_actions: report.overallStats.failed,
        success_rate: report.overallStats.successRate,
        average_time: report.overallStats.averageTime,
        average_confidence: report.overallStats.averageConfidence,
        
        // Method statistics
        method_stats: report.methodStats,
        
        // Detailed data
        actions: report.actions,
        errors: report.errors,
        error_count: report.errors.length,
        
        // Full report for complete data
        full_report: report,
        
        // Metadata
        client_id: metadata.clientId || null,
        agent_version: metadata.agentVersion || null
      };
      
      // Insert into database
      const { data, error } = await supabase
        .from('execution_reports')
        .insert(dbReport)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log(`\n💾 Execution report saved to database (ID: ${data.id})`);
      
      // Optionally update job with report ID
      if (metadata.jobId && data.id) {
        await supabase
          .from('jobs')
          .update({ 
            execution_report_id: data.id,
            results: {
              ...metadata.existingResults,
              executionReportId: data.id,
              summary: {
                total: report.overallStats.total,
                successful: report.overallStats.successful,
                failed: report.overallStats.failed,
                successRate: report.overallStats.successRate,
                duration: report.duration
              }
            }
          })
          .eq('id', metadata.jobId);
      }
      
      return { success: true, reportId: data.id, data };
      
    } catch (error) {
      console.error(`\n❌ Failed to save execution report to database: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Send execution report to API endpoint (Phase 7.2 Part 2)
   * @param {string} apiUrl - API endpoint URL
   * @param {Object} metadata - Additional metadata
   * @param {Object} headers - Optional headers (auth, etc.)
   * @returns {Promise<Object>} API response
   */
  async sendReportToAPI(apiUrl, metadata = {}, headers = {}) {
    try {
      const report = this.executionReport;
      
      const payload = {
        report,
        metadata: {
          workflowName: metadata.workflowName || report.workflowId,
          platform: metadata.platform || null,
          clientId: metadata.clientId || null,
          agentVersion: metadata.agentVersion || null,
          ...metadata
        }
      };
      
      // Use fetch or axios if available
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      console.log(`\n📡 Execution report sent to API: ${apiUrl}`);
      
      return { success: true, response: result };
      
    } catch (error) {
      console.error(`\n❌ Failed to send execution report to API: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
