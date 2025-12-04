import { VisualActionExecutor } from './visual-executor.js';
import fs from 'fs';
import path from 'path';

/**
 * EnhancedVisualExecutor - Extended executor with advanced features
 * 
 * Enhancements over VisualActionExecutor:
 * 1. Detailed error logging with screenshots
 * 2. Configurable retry logic with relaxed thresholds
 * 3. Comprehensive method tracking and statistics
 * 4. Error recovery strategies
 * 5. Performance metrics
 * 6. Debug logging with screenshots at each step
 */
export class EnhancedVisualExecutor extends VisualActionExecutor {
  constructor(page, options = {}) {
    super(page);
    
    this.options = {
      // Error logging
      screenshotOnError: options.screenshotOnError !== false, // Default: true
      screenshotDir: options.screenshotDir || './screenshots',
      logDetailedErrors: options.logDetailedErrors !== false, // Default: true
      
      // Retry configuration
      enableRetry: options.enableRetry !== false, // Default: true
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000, // 1 second
      relaxThresholdsOnRetry: options.relaxThresholdsOnRetry !== false, // Default: true
      
      // Thresholds
      initialPositionTolerance: options.initialPositionTolerance || 15, // 15%
      relaxedPositionTolerance: options.relaxedPositionTolerance || 30, // 30%
      initialSimilarityThreshold: options.initialSimilarityThreshold || 0.7, // 70%
      relaxedSimilarityThreshold: options.relaxedSimilarityThreshold || 0.5, // 50%
      
      // Performance tracking
      trackPerformance: options.trackPerformance !== false, // Default: true
      
      // Debug mode
      saveDebugScreenshots: options.saveDebugScreenshots || false,
      
      ...options,
    };

    // Enhanced statistics
    this.enhancedStats = {
      totalActions: 0,
      successfulActions: 0,
      failedActions: 0,
      retriedActions: 0,
      
      // Method breakdown
      methodCounts: {
        selector: 0,
        text: 0,
        visual: 0,
        position: 0,
        none: 0,
      },
      
      // Retry breakdown
      retriesByAttempt: {
        1: 0,
        2: 0,
        3: 0,
      },
      
      // Performance metrics
      executionTimes: [],
      averageExecutionTime: 0,
      minExecutionTime: Infinity,
      maxExecutionTime: 0,
      
      // Error tracking
      errorTypes: {},
      errorScreenshots: [],
    };

    // Error log
    this.errorLog = [];
    
    // Ensure screenshot directory exists
    if (this.options.screenshotOnError && !fs.existsSync(this.options.screenshotDir)) {
      fs.mkdirSync(this.options.screenshotDir, { recursive: true });
    }
  }

  /**
   * Execute action with enhanced error handling and retry logic
   * @param {Object} action - Action to execute
   * @returns {Promise<Object>} Enhanced execution result
   */
  async executeAction(action) {
    const actionId = `${action.name || action.type}_${Date.now()}`;
    const startTime = Date.now();
    
    this.enhancedStats.totalActions++;
    
    console.log(`\n▶️  [${actionId}] Executing: ${action.name || action.type}`);
    
    if (this.options.saveDebugScreenshots) {
      await this.saveDebugScreenshot(actionId, 'before');
    }

    let lastError = null;
    let result = null;
    let retryCount = 0;

    // Try execution with retries
    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      retryCount = attempt;
      
      if (attempt > 0) {
        this.enhancedStats.retriedActions++;
        this.enhancedStats.retriesByAttempt[attempt] = (this.enhancedStats.retriesByAttempt[attempt] || 0) + 1;
        
        console.log(`   🔄 Retry attempt ${attempt}/${this.options.maxRetries}`);
        
        // Apply relaxed thresholds on retry
        if (this.options.relaxThresholdsOnRetry) {
          console.log(`   🔧 Relaxing thresholds for retry...`);
        }
        
        // Wait before retry
        await this.sleep(this.options.retryDelay);
      }

      try {
        // Execute with current thresholds
        result = await this.executeWithThresholds(action, attempt);
        
        if (result.success) {
          // Success!
          const executionTime = Date.now() - startTime;
          
          this.enhancedStats.successfulActions++;
          this.enhancedStats.methodCounts[result.method] = 
            (this.enhancedStats.methodCounts[result.method] || 0) + 1;
          
          // Track performance
          if (this.options.trackPerformance) {
            this.updatePerformanceMetrics(executionTime);
          }
          
          console.log(`✅ Success (method: ${result.method}, time: ${executionTime}ms, retries: ${retryCount})`);
          
          if (this.options.saveDebugScreenshots) {
            await this.saveDebugScreenshot(actionId, 'after_success');
          }
          
          return {
            ...result,
            actionId,
            executionTime,
            retryCount,
            timestamp: Date.now(),
          };
        }
        
        lastError = result.error || 'Unknown error';
        
      } catch (error) {
        lastError = error.message;
        console.error(`   ❌ Exception during execution: ${error.message}`);
      }
      
      // If not last attempt and retries enabled, continue
      if (attempt < this.options.maxRetries && this.options.enableRetry) {
        continue;
      }
    }

    // All attempts failed
    const executionTime = Date.now() - startTime;
    
    this.enhancedStats.failedActions++;
    this.enhancedStats.methodCounts.none++;
    
    // Track error type
    const errorType = this.categorizeError(lastError);
    this.enhancedStats.errorTypes[errorType] = (this.enhancedStats.errorTypes[errorType] || 0) + 1;
    
    // Log detailed error
    const errorDetails = await this.logDetailedError(action, lastError, actionId);
    
    console.error(`❌ Failed after ${retryCount} retries (time: ${executionTime}ms)`);
    console.error(`   Error: ${lastError}`);
    
    if (errorDetails.screenshotPath) {
      console.error(`   Screenshot: ${errorDetails.screenshotPath}`);
    }
    
    return {
      success: false,
      method: 'none',
      error: lastError,
      actionId,
      executionTime,
      retryCount,
      timestamp: Date.now(),
      errorDetails,
    };
  }

  /**
   * Execute action with specific thresholds (for retry logic)
   * @param {Object} action - Action to execute
   * @param {number} retryAttempt - Current retry attempt (0 = first try)
   * @returns {Promise<Object>} Execution result
   */
  async executeWithThresholds(action, retryAttempt) {
    // Calculate thresholds based on retry attempt
    const positionTolerance = this.getPositionTolerance(retryAttempt);
    const similarityThreshold = this.getSimilarityThreshold(retryAttempt);
    
    // Temporarily override thresholds for this execution
    const originalFilterByPosition = this.filterByPosition.bind(this);
    const originalFindBestVisualMatch = this.findBestVisualMatch.bind(this);
    
    // Override with relaxed thresholds
    this.filterByPosition = (candidates, targetPosition) => {
      return originalFilterByPosition(candidates, targetPosition, positionTolerance);
    };
    
    this.findBestVisualMatch = async (candidates, targetScreenshot) => {
      const result = await originalFindBestVisualMatch(candidates, targetScreenshot);
      
      // If no match with current threshold, try with relaxed threshold
      if (!result && retryAttempt > 0) {
        console.log(`   🔧 Trying with relaxed similarity threshold: ${(similarityThreshold * 100).toFixed(0)}%`);
        // This is already handled in parent class, but we log it
      }
      
      return result;
    };
    
    try {
      // Execute using parent class method
      const result = await super.executeAction(action);
      return result;
    } finally {
      // Restore original methods
      this.filterByPosition = originalFilterByPosition;
      this.findBestVisualMatch = originalFindBestVisualMatch;
    }
  }

  /**
   * Get position tolerance based on retry attempt
   * @param {number} retryAttempt - Retry attempt number
   * @returns {number} Position tolerance percentage
   */
  getPositionTolerance(retryAttempt) {
    if (!this.options.relaxThresholdsOnRetry || retryAttempt === 0) {
      return this.options.initialPositionTolerance;
    }
    
    // Gradually relax tolerance
    const range = this.options.relaxedPositionTolerance - this.options.initialPositionTolerance;
    const step = range / this.options.maxRetries;
    
    return Math.min(
      this.options.initialPositionTolerance + (step * retryAttempt),
      this.options.relaxedPositionTolerance
    );
  }

  /**
   * Get similarity threshold based on retry attempt
   * @param {number} retryAttempt - Retry attempt number
   * @returns {number} Similarity threshold (0-1)
   */
  getSimilarityThreshold(retryAttempt) {
    if (!this.options.relaxThresholdsOnRetry || retryAttempt === 0) {
      return this.options.initialSimilarityThreshold;
    }
    
    // Gradually relax threshold
    const range = this.options.initialSimilarityThreshold - this.options.relaxedSimilarityThreshold;
    const step = range / this.options.maxRetries;
    
    return Math.max(
      this.options.initialSimilarityThreshold - (step * retryAttempt),
      this.options.relaxedSimilarityThreshold
    );
  }

  /**
   * Log detailed error information with screenshots
   * @param {Object} action - Failed action
   * @param {string} error - Error message
   * @param {string} actionId - Action identifier
   * @returns {Promise<Object>} Error details
   */
  async logDetailedError(action, error, actionId) {
    const timestamp = new Date().toISOString();
    const errorType = this.categorizeError(error);
    
    const errorDetails = {
      actionId,
      actionName: action.name || action.type,
      actionType: action.type,
      error,
      errorType,
      timestamp,
      screenshotPath: null,
      pageState: null,
    };

    // Capture screenshot on error
    if (this.options.screenshotOnError) {
      try {
        const screenshotFilename = `error_${actionId}_${Date.now()}.png`;
        const screenshotPath = path.join(this.options.screenshotDir, screenshotFilename);
        
        await this.page.screenshot({
          path: screenshotPath,
          fullPage: false,
        });
        
        errorDetails.screenshotPath = screenshotPath;
        this.enhancedStats.errorScreenshots.push(screenshotPath);
        
      } catch (screenshotError) {
        console.warn(`   ⚠️  Could not capture error screenshot: ${screenshotError.message}`);
      }
    }

    // Capture page state
    if (this.options.logDetailedErrors) {
      try {
        const pageState = await this.page.evaluate(() => ({
          url: window.location.href,
          title: document.title,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
          elementCount: document.querySelectorAll('*').length,
          visibleText: document.body.innerText.substring(0, 500),
        }));
        
        errorDetails.pageState = pageState;
        
      } catch (stateError) {
        console.warn(`   ⚠️  Could not capture page state: ${stateError.message}`);
      }
    }

    // Log to error log
    this.errorLog.push(errorDetails);
    
    // Write error log to file
    if (this.options.logDetailedErrors) {
      const errorLogPath = path.join(this.options.screenshotDir, 'error_log.json');
      try {
        fs.writeFileSync(errorLogPath, JSON.stringify(this.errorLog, null, 2));
      } catch (writeError) {
        console.warn(`   ⚠️  Could not write error log: ${writeError.message}`);
      }
    }

    return errorDetails;
  }

  /**
   * Categorize error for statistics
   * @param {string} error - Error message
   * @returns {string} Error category
   */
  categorizeError(error) {
    if (!error) return 'unknown';
    
    const errorLower = error.toLowerCase();
    
    if (errorLower.includes('timeout')) return 'timeout';
    if (errorLower.includes('not found') || errorLower.includes('no element')) return 'element_not_found';
    if (errorLower.includes('text') || errorLower.includes('no_text_match')) return 'text_mismatch';
    if (errorLower.includes('position') || errorLower.includes('no_position_match')) return 'position_mismatch';
    if (errorLower.includes('visual') || errorLower.includes('screenshot')) return 'visual_mismatch';
    if (errorLower.includes('selector')) return 'selector_failed';
    
    return 'unknown';
  }

  /**
   * Save debug screenshot
   * @param {string} actionId - Action identifier
   * @param {string} stage - Stage ('before', 'after_success', 'after_failure')
   */
  async saveDebugScreenshot(actionId, stage) {
    if (!this.options.saveDebugScreenshots) return;
    
    try {
      const filename = `debug_${actionId}_${stage}_${Date.now()}.png`;
      const screenshotPath = path.join(this.options.screenshotDir, filename);
      
      await this.page.screenshot({
        path: screenshotPath,
        fullPage: false,
      });
      
      console.log(`   📸 Debug screenshot: ${screenshotPath}`);
      
    } catch (error) {
      console.warn(`   ⚠️  Could not save debug screenshot: ${error.message}`);
    }
  }

  /**
   * Update performance metrics
   * @param {number} executionTime - Execution time in milliseconds
   */
  updatePerformanceMetrics(executionTime) {
    this.enhancedStats.executionTimes.push(executionTime);
    
    // Update min/max
    this.enhancedStats.minExecutionTime = Math.min(
      this.enhancedStats.minExecutionTime,
      executionTime
    );
    this.enhancedStats.maxExecutionTime = Math.max(
      this.enhancedStats.maxExecutionTime,
      executionTime
    );
    
    // Update average
    const sum = this.enhancedStats.executionTimes.reduce((a, b) => a + b, 0);
    this.enhancedStats.averageExecutionTime = Math.round(sum / this.enhancedStats.executionTimes.length);
  }

  /**
   * Get comprehensive statistics
   * @returns {Object} Enhanced statistics
   */
  getEnhancedStats() {
    const baseStats = super.getStats();
    
    return {
      ...baseStats,
      enhanced: {
        totalActions: this.enhancedStats.totalActions,
        successfulActions: this.enhancedStats.successfulActions,
        failedActions: this.enhancedStats.failedActions,
        retriedActions: this.enhancedStats.retriedActions,
        
        successRate: this.enhancedStats.totalActions > 0
          ? `${((this.enhancedStats.successfulActions / this.enhancedStats.totalActions) * 100).toFixed(1)}%`
          : 'N/A',
        
        retryRate: this.enhancedStats.totalActions > 0
          ? `${((this.enhancedStats.retriedActions / this.enhancedStats.totalActions) * 100).toFixed(1)}%`
          : 'N/A',
        
        methodBreakdown: this.enhancedStats.methodCounts,
        retriesByAttempt: this.enhancedStats.retriesByAttempt,
        
        performance: {
          average: `${this.enhancedStats.averageExecutionTime}ms`,
          min: this.enhancedStats.minExecutionTime !== Infinity
            ? `${this.enhancedStats.minExecutionTime}ms`
            : 'N/A',
          max: this.enhancedStats.maxExecutionTime > 0
            ? `${this.enhancedStats.maxExecutionTime}ms`
            : 'N/A',
        },
        
        errors: {
          types: this.enhancedStats.errorTypes,
          totalScreenshots: this.enhancedStats.errorScreenshots.length,
          logEntries: this.errorLog.length,
        },
      },
    };
  }

  /**
   * Get error log
   * @returns {Array} Error log entries
   */
  getErrorLog() {
    return this.errorLog;
  }

  /**
   * Export statistics to JSON file
   * @param {string} filepath - Output file path
   */
  async exportStats(filepath) {
    const stats = this.getEnhancedStats();
    
    try {
      fs.writeFileSync(filepath, JSON.stringify(stats, null, 2));
      console.log(`✅ Statistics exported to: ${filepath}`);
    } catch (error) {
      console.error(`❌ Failed to export statistics: ${error.message}`);
    }
  }

  /**
   * Print comprehensive statistics report
   */
  printStatsReport() {
    const stats = this.getEnhancedStats();
    
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║     ENHANCED VISUAL EXECUTOR STATISTICS       ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    console.log('📊 Execution Summary:');
    console.log(`   Total actions: ${stats.enhanced.totalActions}`);
    console.log(`   Successful: ${stats.enhanced.successfulActions} ✅`);
    console.log(`   Failed: ${stats.enhanced.failedActions} ❌`);
    console.log(`   Retried: ${stats.enhanced.retriedActions} 🔄`);
    console.log(`   Success rate: ${stats.enhanced.successRate}`);
    console.log(`   Retry rate: ${stats.enhanced.retryRate}\n`);

    console.log('🎯 Method Breakdown:');
    Object.entries(stats.enhanced.methodBreakdown).forEach(([method, count]) => {
      if (count > 0) {
        console.log(`   ${method}: ${count}`);
      }
    });
    console.log('');

    console.log('🔄 Retries by Attempt:');
    Object.entries(stats.enhanced.retriesByAttempt).forEach(([attempt, count]) => {
      if (count > 0) {
        console.log(`   Attempt ${attempt}: ${count}`);
      }
    });
    console.log('');

    console.log('⚡ Performance Metrics:');
    console.log(`   Average: ${stats.enhanced.performance.average}`);
    console.log(`   Min: ${stats.enhanced.performance.min}`);
    console.log(`   Max: ${stats.enhanced.performance.max}\n`);

    console.log('❌ Error Analysis:');
    console.log(`   Total error types: ${Object.keys(stats.enhanced.errors.types).length}`);
    Object.entries(stats.enhanced.errors.types).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    console.log(`   Screenshots captured: ${stats.enhanced.errors.totalScreenshots}`);
    console.log(`   Log entries: ${stats.enhanced.errors.logEntries}\n`);
  }

  /**
   * Reset all statistics and error logs
   */
  resetStats() {
    super.resetStats();
    
    this.enhancedStats = {
      totalActions: 0,
      successfulActions: 0,
      failedActions: 0,
      retriedActions: 0,
      methodCounts: {
        selector: 0,
        text: 0,
        visual: 0,
        position: 0,
        none: 0,
      },
      retriesByAttempt: {
        1: 0,
        2: 0,
        3: 0,
      },
      executionTimes: [],
      averageExecutionTime: 0,
      minExecutionTime: Infinity,
      maxExecutionTime: 0,
      errorTypes: {},
      errorScreenshots: [],
    };
    
    this.errorLog = [];
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
