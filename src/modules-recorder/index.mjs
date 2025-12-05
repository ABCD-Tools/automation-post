import { launchBrowser, navigateToUrl } from './utils/browser-setup.mjs';
import { NavigationHandler } from './utils/navigation-handler.mjs';
import { waitForPageStability, waitForLoginCompletion } from './utils/page-stability.mjs';
import { captureClick as captureClickUtil, captureType as captureTypeUtil, screenshotElement as screenshotElementUtil, screenshotArea as screenshotAreaUtil, getSurroundingText as getSurroundingTextUtil } from './utils/visual-capture.mjs';
import { generateSelector } from './utils/selector-generator.mjs';
import { convertToMicroActions } from './utils/action-converter.mjs';
import { validateVisualData } from './utils/validation.mjs';
import { replaceWithTemplate } from './utils/template-replacement.mjs';
import { getPlatformConfig } from './config/platform.mjs';
import { RecorderClientScript } from './client-script/recorderClientScript.mjs';
import { saveFilesToCloud } from '../modules-logic/utils/saveFilesToCloud.mjs';

/**
 * ActionRecorder - Records user interactions with VISUAL DATA (screenshots, coordinates, text)
 * instead of fragile DOM selectors. This makes automation robust against UI changes.
 * 
 * Visual Recording Strategy:
 * 1. Capture WHAT THE USER SEES (screenshots, text, positions) instead of DOM structure
 * 2. Store visual data as primary method for element identification
 * 3. Generate backup selectors as fallback for fast execution
 * 4. Use execution_method to control priority (visual_first, selector_first, visual_only)
 * 
 * Key Features:
 * - Captures element screenshots for visual matching
 * - Records absolute and relative coordinates
 * - Extracts visible text and surrounding context
 * - Generates backup selectors as fallback
 * - Auto-replaces sensitive values with template variables
 * 
 * Execution Method Priorities:
 * - selector_first: Try CSS selector first (fast), fallback to visual if fails
 * - visual_first: Try visual search first (robust), fallback to selector if fails
 * - visual_only: Use only visual data, ignore selectors completely (most robust)
 * 
 * @class ActionRecorder
 */
export class ActionRecorder {
  constructor() {
    this.browser = null;
    this.page = null;
    this.recordedActions = [];
    this.isRecording = false;
    this.backupActions = []; // Backup storage for actions (survives navigation)
    this.syncInterval = null; // Interval for periodic syncing
    this.navigationHandler = null; // Navigation handler instance
    this.platformConfig = null; // Platform-specific configuration
    this.injectionSuccess = true; // Track injection success
    this.currentPlatform = null; // Current platform being recorded
    this.uploadQueue = []; // Queue for background uploads
    this.isProcessingQueue = false; // Flag to prevent concurrent queue processing
    this.uploadQueueInterval = null; // Interval for processing upload queue
    this.sessionId = null; // Session ID for organizing uploads
    this.lastActionCount = 0; // Track last action count for real-time capture
  }

  /**
   * Start recording actions on a given URL
   * @param {string} url - URL to navigate to
   * @param {string} platform - Platform name (instagram, facebook, twitter)
   * @returns {Promise<Object>} Session info
   */
  async startRecording(url, platform) {
    try {
      const config = await getPlatformConfig(platform);

      // Launch browser with platform-specific configuration
      const { browser, page } = await launchBrowser(config);
      this.browser = browser;
      this.page = page;
      this.platformConfig = config;
      this.currentPlatform = platform;

      // Navigate to URL
      await navigateToUrl(page, url);

      // Inject recorder script AFTER page loads
      console.log('💉 Injecting recorder script...');
      await this.injectRecorderScript();

      // Verify injection with retry mechanism
      let injectionVerified = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        const exists = await this.page.evaluate(() => {
          return window.__recordedActions !== undefined && Array.isArray(window.__recordedActions);
        });

        if (exists) {
          injectionVerified = true;
          console.log('✅ Recorder script active');
          break;
        } else {
          console.log(`⚠️ Script injection verification failed (attempt ${attempt}/3), retrying...`);
          if (attempt < 3) {
            await this.injectRecorderScript();
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      if (!injectionVerified) {
        console.error('❌ Script injection failed after 3 attempts');
        throw new Error('Failed to inject recorder script');
      }

      // Record initial navigation
      await this.page.evaluate((url) => {
        if (window.__recordedActions) {
          window.__recordedActions.push({
            type: 'navigate',
            timestamp: Date.now(),
            url: url,
            method: 'initial_load',
          });
          console.log('🧭 Recorded initial navigation:', url);
        }
      }, url);

      this.isRecording = true;
      console.log('✅ Recording started');

      // Generate session ID for organizing uploads
      this.sessionId = `${platform}_${Date.now()}`;

      // Set up periodic action syncing (backup strategy) + real-time screenshot capture
      this.syncInterval = setInterval(async () => {
        try {
          if (this.page && !this.page.isClosed()) {
            const actions = await this.page.evaluate(() => {
              return window.__recordedActions || [];
            });
            this.backupActions = actions;
            
            // Real-time screenshot capture: capture screenshots for new actions
            if (actions.length > this.lastActionCount) {
              const newActionIndices = [];
              for (let i = this.lastActionCount; i < actions.length; i++) {
                newActionIndices.push(i);
              }
              
              for (const actionIndex of newActionIndices) {
                await this.captureScreenshotForAction(actionIndex);
              }
              this.lastActionCount = actions.length;
            }
            
            if (actions.length > 0) {
              console.log(`🔄 Synced ${actions.length} actions to backup`);
            }
          }
        } catch (error) {
          // Silently ignore errors (page might be navigating)
        }
      }, 2000); // Check every 2 seconds for new actions

      // Start upload queue processor
      this.startUploadQueueProcessor();

      // Initialize navigation handler
      this.navigationHandler = new NavigationHandler(this);
      this.navigationHandler.initialize(page, url, platform);

      return {
        url,
        platform,
        startedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      throw error;
    }
  }

  /**
   * Wait for page stability (network idle + no DOM mutations)
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<boolean>} True if stable, false if timeout
   */
  async waitForPageStability(timeout = null) {
    return waitForPageStability(this.page, this.platformConfig, timeout);
  }

  /**
   * Wait for Instagram login completion
   * @returns {Promise<boolean>} True if login detected, false if timeout
   */
  async waitForLoginCompletion() {
    return waitForLoginCompletion(this.page, this.platformConfig);
  }

  /**
   * Re-inject recorder script with graceful degradation
   * @param {Array|null} previousActionsFromServer - Optional cached actions from Node
   * @returns {Promise<void>}
   */
  async reinjectRecorderScript(previousActionsFromServer = null) {
    try {
      console.log('🔄 Re-injecting recorder script...');
      let previousActions = [];

      // Prefer server-provided backup (avoids relying on window.__recordedActions on new pages)
      if (Array.isArray(previousActionsFromServer) && previousActionsFromServer.length > 0) {
        previousActions = previousActionsFromServer;
        console.log(`   💾 Using ${previousActions.length} cached actions from server for re-injection`);
      } else {
        // Fallback: try to read from page (will gracefully use this.backupActions if unavailable)
        previousActions = await this.getRecordedActions(3);
      }
      
      // Re-inject script
      await this.injectRecorderScript();
      
      // Restore previous actions
      if (previousActions && previousActions.length > 0) {
        // Keep Node-side backup in sync
        this.backupActions = previousActions;

        await this.page.evaluate((actions) => {
          window.__recordedActions = actions;
          console.log('✅ Restored ' + actions.length + ' previous actions');
        }, previousActions);
      }
      
      this.injectionSuccess = true;
    } catch (error) {
      console.log('⚠️ Re-injection failed:', error.message);
      console.log('💡 Continuing with backup actions only');
      this.injectionSuccess = false;
    }
  }

  /**
   * Inject comprehensive recorder script with VISUAL DATA CAPTURE
   * Captures screenshots, coordinates, text, and surrounding context
   * 
   * Note: The client-side script is kept inline here as it needs to be injected as a string.
   * For better maintainability, consider extracting to a separate file and loading it.
   */
  async injectRecorderScript() {
    // Client-side recorder script (extracted from original implementation)
    // This is a large string that gets injected into the page
    const recorderScript = await this.getClientRecorderScript();
    
    // Inject into current page
    await this.page.evaluate(recorderScript);
  }

  /**
   * Get client-side recorder script
   * This method can be overridden to load from a file if needed
   * @returns {Promise<string>} The recorder script as a string
   */
  async getClientRecorderScript() {
    // For now, return the inline script
    // TODO: Consider loading from a separate file for better maintainability
    return this.getInlineRecorderScript();
  }

  /**
   * Get inline recorder script (original implementation)
   * This is kept here for now but could be moved to a separate file
   * @returns {string} The recorder script
   */
  getInlineRecorderScript() {
    // Return the full script from backup file
    // The backup file exports it as a template string, we just return it directly
    return RecorderClientScript;
  }

  /**
   * Get recorded actions from the page
   * @param {number} maxRetries - Maximum number of retry attempts
   * @returns {Promise<Array>} Array of recorded actions with visual data
   */
  async getRecordedActions(maxRetries = 3) {
    // Check if page is valid
    if (!this.page) {
      console.log('   ❌ Page is null, cannot retrieve actions');
      return this.backupActions || [];
    }

    // Check if page is closed
    try {
      if (this.page.isClosed()) {
        console.log('   ❌ Page is closed, cannot retrieve actions');
        return this.backupActions || [];
      }
    } catch (error) {
      // Ignore - page might be in transition
    }

    // Retry logic with exponential backoff
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt === 1) {
          console.log('🔍 Attempting to retrieve recorded actions...');
        } else {
          console.log(`🔍 Retrieving actions (attempt ${attempt}/${maxRetries})...`);
        }
        
        // Check if window.__recordedActions exists
        const actionsExist = await this.page.evaluate(() => {
          return typeof window.__recordedActions !== 'undefined';
        });
        
        if (attempt === 1) {
          console.log('   window.__recordedActions exists:', actionsExist);
        }
        
        if (!actionsExist) {
          console.log('   ❌ window.__recordedActions is undefined!');
          console.log('   💡 Using backup actions if available');
          return this.backupActions || [];
        }
        
        // Get count first
        const count = await this.page.evaluate(() => {
          return window.__recordedActions ? window.__recordedActions.length : 0;
        });
        
        if (attempt === 1) {
          console.log('   📊 Actions in array:', count);
        }
        
        // Retrieve actions
        const actions = await this.page.evaluate(() => {
          return window.__recordedActions || [];
        });
        
        console.log(`   ✅ Retrieved ${actions.length} actions`);
        console.log(`📦 Retrieved ${actions.length} actions with visual data`);
        
        // Log summary of visual data
        const withScreenshots = actions.filter(a => a.visual?.screenshot).length;
        const withoutScreenshots = actions.length - withScreenshots;
        console.log(`   ${withScreenshots} actions have screenshots`);
        console.log(`   ${withoutScreenshots} actions without screenshots`);
        
        return actions;
        
      } catch (error) {
        const isTimeout = error.message.includes('timeout') || 
                         error.message.includes('Timeout') ||
                         error.message.includes('Protocol error');
        
        if (isTimeout && attempt < maxRetries) {
          const waitTime = Math.min(5000 * attempt, 15000);
          console.log(`   ⏳ Timeout on attempt ${attempt}, waiting ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        // Non-timeout errors or last attempt
        if (attempt === maxRetries) {
          console.error('   ❌ Error retrieving actions:', error.message);
          console.log('   💡 All retries exhausted, using backup');
          return this.backupActions || [];
        }
        
        throw error;
      }
    }
    
    console.log('   💡 All retries exhausted, using backup');
    return this.backupActions || [];
  }

  /**
   * Server-side: Capture click action with comprehensive visual data
   * @param {ElementHandle} elementHandle - Puppeteer element handle
   * @param {number} clientX - Click X coordinate
   * @param {number} clientY - Click Y coordinate
   * @returns {Promise<Object>} Action object with visual data
   */
  async captureClick(elementHandle, clientX, clientY) {
    return captureClickUtil(this.page, elementHandle, clientX, clientY);
  }

  /**
   * Server-side: Capture element screenshot using Puppeteer
   * @param {ElementHandle} elementHandle - Puppeteer element handle
   * @returns {Promise<string|null>} Base64 data URL or null
   */
  async screenshotElement(elementHandle) {
    return screenshotElementUtil(elementHandle);
  }

  /**
   * Server-side: Capture screenshot of area around element (with padding)
   * @param {ElementHandle} elementHandle - Puppeteer element handle
   * @param {number} padding - Padding in pixels (default 100)
   * @returns {Promise<string|null>} Base64 data URL or null
   */
  async screenshotArea(elementHandle, padding = 100) {
    return screenshotAreaUtil(this.page, elementHandle, padding);
  }

  /**
   * Server-side: Get surrounding text from parent and siblings
   * @param {ElementHandle} elementHandle - Puppeteer element handle
   * @returns {Promise<string[]>} Array of surrounding text (max 5 items)
   */
  async getSurroundingText(elementHandle) {
    return getSurroundingTextUtil(elementHandle);
  }

  /**
   * Server-side: Generate backup CSS selector (fallback only)
   * @param {ElementHandle} elementHandle - Puppeteer element handle
   * @returns {Promise<string|null>} CSS selector or null
   */
  async generateSelector(elementHandle) {
    return generateSelector(elementHandle, (fn) => elementHandle.evaluate(fn));
  }

  /**
   * Server-side: Capture type/input action with visual data
   * @param {ElementHandle} elementHandle - Puppeteer element handle
   * @param {string} value - Input value (will be templated if sensitive)
   * @returns {Promise<Object>} Action object with visual data and templated value
   */
  async captureType(elementHandle, value) {
    return captureTypeUtil(this.page, elementHandle, value);
  }

  /**
   * @deprecated This method is no longer used. Screenshots are now captured
   * in real-time during recording, not after recording stops.
   * 
   * This method is kept for backward compatibility but will be removed in a future version.
   * 
   * @param {Array} recordedActions
   * @returns {Promise<Array>} Actions (unchanged, no enrichment)
   */
  async enrichRecordedActionsWithPuppeteer(recordedActions) {
    // Screenshots are now captured in real-time during recording
    // No post-recording enrichment needed
    console.log('📸 Enrichment pass skipped (screenshots captured in real-time)');
    return recordedActions;
  }

  /**
   * Server-side: Capture element screenshot using Puppeteer (legacy method name)
   * @param {ElementHandle} elementHandle - Puppeteer element handle
   * @returns {Promise<string|null>} Base64 data URL or null
   */
  async screenshotElementPuppeteer(elementHandle) {
    return this.screenshotElement(elementHandle);
  }

  /**
   * Server-side: Get element visual data using Puppeteer
   * @param {ElementHandle} elementHandle - Puppeteer element handle
   * @returns {Promise<Object>} Visual data object
   */
  async getElementVisualData(elementHandle) {
    try {
      // Get element info
      const elementInfo = await elementHandle.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return {
          text: el.textContent?.trim().substring(0, 200) || '',
          placeholder: el.placeholder || '',
          name: el.name || '',
          type: el.type || '',
          boundingBox: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
          position: {
            absolute: {
              x: Math.round(rect.left + rect.width / 2),
              y: Math.round(rect.top + rect.height / 2),
            },
          },
        };
      });

      // Capture screenshot
      const screenshot = await this.screenshotElementPuppeteer(elementHandle);

      return {
        screenshot,
        text: elementInfo.text,
        placeholder: elementInfo.placeholder,
        boundingBox: elementInfo.boundingBox,
        position: elementInfo.position,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.warn('Failed to get element visual data:', error);
      return null;
    }
  }

  /**
   * Capture screenshot immediately after action is recorded (real-time)
   * @param {number} actionIndex - Index of the action in window.__recordedActions
   * @returns {Promise<void>}
   */
  async captureScreenshotForAction(actionIndex) {
    if (!this.page || this.page.isClosed()) {
      return;
    }

    try {
      // Get action from page context
      const action = await this.page.evaluate((index) => {
        if (window.__recordedActions && window.__recordedActions[index]) {
          return window.__recordedActions[index];
        }
        return null;
      }, actionIndex);

      if (!action) {
        return;
      }

      // Skip if already has screenshot (and it's a URL)
      if (action.visual?.screenshot && action.visual.screenshot.startsWith('http')) {
        return; // Already uploaded
      }

      // Only capture for click, type, and navigate actions
      if (!['click', 'type', 'navigate'].includes(action.type)) {
        return;
      }

      // For navigate actions, capture full page screenshot
      if (action.type === 'navigate') {
        const screenshot = await this.page.screenshot({
          encoding: 'base64',
          type: 'png',
          fullPage: true,
        });
        
        if (screenshot) {
          const dataUrl = `data:image/png;base64,${screenshot}`;
          
          // Update action in page context
          await this.page.evaluate((index, screenshotData) => {
            if (window.__recordedActions && window.__recordedActions[index]) {
              if (!window.__recordedActions[index].visual) {
                window.__recordedActions[index].visual = {};
              }
              window.__recordedActions[index].visual.screenshot = screenshotData;
            }
          }, actionIndex, dataUrl);
          
          console.log(`📸 Screenshot captured for navigation action ${actionIndex + 1}`);
          
          // Get updated action and queue for upload
          const updatedAction = await this.page.evaluate((index) => {
            return window.__recordedActions && window.__recordedActions[index] ? window.__recordedActions[index] : null;
          }, actionIndex);
          
          if (updatedAction) {
            this.queueUpload(updatedAction, actionIndex);
          }
        }
        return;
      }

      // For click/type actions, try to capture element screenshot
      if (action.backup_selector) {
        try {
          const handle = await this.page.$(action.backup_selector);
          if (handle) {
            if (action.type === 'click') {
              const absPos = action.visual?.position?.absolute || {};
              const clientX = typeof absPos.x === 'number' ? absPos.x : undefined;
              const clientY = typeof absPos.y === 'number' ? absPos.y : undefined;

              if (clientX != null && clientY != null) {
                const enrichedClick = await this.captureClick(handle, clientX, clientY);
                if (enrichedClick.visual?.screenshot) {
                  // Update action in page context
                  await this.page.evaluate((index, visualData) => {
                    if (window.__recordedActions && window.__recordedActions[index]) {
                      if (!window.__recordedActions[index].visual) {
                        window.__recordedActions[index].visual = {};
                      }
                      window.__recordedActions[index].visual.screenshot = visualData.screenshot;
                      if (visualData.contextScreenshot) {
                        window.__recordedActions[index].visual.contextScreenshot = visualData.contextScreenshot;
                      }
                    }
                  }, actionIndex, enrichedClick.visual);
                  
                  console.log(`📸 Screenshot captured for click action ${actionIndex + 1}`);
                  
                  // Get updated action and queue for upload
                  const updatedAction = await this.page.evaluate((index) => {
                    return window.__recordedActions && window.__recordedActions[index] ? window.__recordedActions[index] : null;
                  }, actionIndex);
                  
                  if (updatedAction) {
                    this.queueUpload(updatedAction, actionIndex);
                  }
                }
              }
            } else if (action.type === 'type') {
              const enrichedType = await this.captureType(handle, action.value || '');
              if (enrichedType.visual?.screenshot) {
                // Update action in page context
                await this.page.evaluate((index, visualData) => {
                  if (window.__recordedActions && window.__recordedActions[index]) {
                    if (!window.__recordedActions[index].visual) {
                      window.__recordedActions[index].visual = {};
                    }
                    window.__recordedActions[index].visual.screenshot = visualData.screenshot;
                  }
                }, actionIndex, enrichedType.visual);
                
                console.log(`📸 Screenshot captured for type action ${actionIndex + 1}`);
                
                // Get updated action and queue for upload
                const updatedAction = await this.page.evaluate((index) => {
                  return window.__recordedActions && window.__recordedActions[index] ? window.__recordedActions[index] : null;
                }, actionIndex);
                
                if (updatedAction) {
                  this.queueUpload(updatedAction, actionIndex);
                }
              }
            }
          }
        } catch (error) {
          // Silently ignore - selector might not be available
        }
      }
    } catch (error) {
      // Silently ignore screenshot capture errors
    }
  }

  /**
   * Queue action for background upload
   * @param {Object} action - Action with screenshot
   * @param {number} actionIndex - Index of the action
   */
  queueUpload(action, actionIndex) {
    // Only queue if screenshot is base64 (not already uploaded)
    if (action.visual?.screenshot && !action.visual.screenshot.startsWith('http')) {
      this.uploadQueue.push({
        action,
        actionIndex,
        timestamp: Date.now(),
      });
      console.log(`☁️ Queued upload for action ${actionIndex + 1}`);
    }
  }

  /**
   * Start background upload queue processor
   */
  startUploadQueueProcessor() {
    // Process queue every 3 seconds
    this.uploadQueueInterval = setInterval(async () => {
      await this.processUploadQueue();
    }, 3000);
  }

  /**
   * Process upload queue (non-blocking, background)
   * @returns {Promise<void>}
   */
  async processUploadQueue() {
    if (this.isProcessingQueue || this.uploadQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    // Process up to 3 uploads at a time
    const batch = this.uploadQueue.splice(0, 3);
    
    for (const item of batch) {
      try {
        const recordingData = {
          sessionId: this.sessionId,
          platform: this.currentPlatform || 'unknown',
          recordedActions: [item.action],
        };

        const result = await saveFilesToCloud(recordingData, {
          folder: 'recordings',
          subfolder: this.sessionId,
          getFilename: (action, idx, field) => {
            const timestamp = action.timestamp || Date.now();
            return `action_${idx}_${field}_${timestamp}`;
          },
          skipIfExists: true,
          keepBase64OnError: true,
          fileFields: ['screenshot', 'contextScreenshot', 'file', 'image'],
        });

        if (result.uploadedCount > 0) {
          // Update action with uploaded URL
          const updatedAction = result.updatedRecordingData.recordedActions[0];
          if (updatedAction && this.page && !this.page.isClosed()) {
            // Update action in page context
            await this.page.evaluate((index, visualData) => {
              if (window.__recordedActions && window.__recordedActions[index]) {
                if (!window.__recordedActions[index].visual) {
                  window.__recordedActions[index].visual = {};
                }
                if (visualData.screenshot) {
                  window.__recordedActions[index].visual.screenshot = visualData.screenshot;
                }
                if (visualData.contextScreenshot) {
                  window.__recordedActions[index].visual.contextScreenshot = visualData.contextScreenshot;
                }
              }
            }, item.actionIndex, updatedAction.visual || {});
            
            // Also update local copy
            Object.assign(item.action, updatedAction);
            console.log(`✅ Uploaded action ${item.actionIndex + 1} screenshot`);
          }
        }
      } catch (error) {
        console.warn(`⚠️ Upload failed for action ${item.actionIndex + 1}, keeping base64:`, error.message);
        // Keep base64 on error (already handled by keepBase64OnError)
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Wait for upload queue to finish
   * @param {number} maxWaitTime - Maximum time to wait in milliseconds (default: 30000)
   * @returns {Promise<void>}
   */
  async waitForUploadQueue(maxWaitTime = 30000) {
    const startTime = Date.now();
    
    while (this.uploadQueue.length > 0 || this.isProcessingQueue) {
      if (Date.now() - startTime > maxWaitTime) {
        console.warn(`⚠️ Upload queue timeout after ${maxWaitTime}ms, ${this.uploadQueue.length} items remaining`);
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (this.uploadQueue.length === 0 && !this.isProcessingQueue) {
      console.log('✅ All uploads complete');
    }
  }

  /**
   * Upload remaining screenshots to cloud (batch upload at end)
   * @param {Array} actions - Array of recorded actions
   * @param {Object} options - Upload options
   * @returns {Promise<Array>} Actions with Cloudinary URLs instead of base64
   */
  async uploadScreenshotsToCloudinary(actions, options = {}) {
    if (!actions || actions.length === 0) {
      return actions;
    }

    try {
      console.log('☁️ Uploading remaining screenshots to cloud...');
      
      const recordingData = {
        sessionId: this.sessionId || `${this.currentPlatform}_${Date.now()}`,
        platform: this.currentPlatform || 'unknown',
        recordedActions: actions,
      };

      // Use new saveFilesToCloud API with proper options
      const result = await saveFilesToCloud(recordingData, {
        folder: 'recordings',
        subfolder: this.sessionId,
        getFilename: (action, idx, field) => {
          const timestamp = action.timestamp || Date.now();
          return `action_${idx}_${field}_${timestamp}`;
        },
        skipIfExists: true,
        keepBase64OnError: true,
        fileFields: ['screenshot', 'contextScreenshot', 'file', 'image'],
        ...options,
      });

      console.log(`✅ Uploaded ${result.uploadedCount} file(s) to cloud`);
      console.log(`⏭️ Skipped ${result.skippedCount} (already URLs)`);
      if (result.errorCount > 0) {
        console.warn(`❌ Failed ${result.errorCount} (kept base64)`);
      }

      // Return updated actions
      return result.updatedRecordingData.recordedActions || actions;
    } catch (error) {
      console.error('❌ Failed to upload screenshots to cloud:', error.message);
      console.warn('   Keeping original base64 screenshots');
      return actions; // Return original actions on error
    }
  }

  /**
   * Stop recording and close browser
   * @param {Object} options - Options
   * @param {boolean} options.uploadToCloudinary - Upload screenshots to cloud (default: true)
   * @returns {Promise<Array>} Final recorded actions
   */
  async stopRecording(options = {}) {
    const { uploadToCloudinary = true } = options;
    
    this.isRecording = false;

    // Clear periodic sync interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Clear upload queue interval
    if (this.uploadQueueInterval) {
      clearInterval(this.uploadQueueInterval);
      this.uploadQueueInterval = null;
    }

    // Get final actions (try live first, fallback to backup)
    const liveActions = await this.getRecordedActions();
    
    // Use backup if live retrieval failed or returned empty
    let finalActions = liveActions.length > 0 ? liveActions : (this.backupActions || []);

    // Wait for upload queue to finish (with timeout)
    if (this.uploadQueue.length > 0 || this.isProcessingQueue) {
      console.log(`⏳ Waiting for ${this.uploadQueue.length} upload(s) to complete...`);
      await this.waitForUploadQueue(30000); // Wait up to 30 seconds
    }

    // Upload any remaining screenshots that weren't uploaded in background
    if (uploadToCloudinary) {
      try {
        finalActions = await this.uploadScreenshotsToCloudinary(finalActions);
      } catch (error) {
        console.warn('⚠️ Failed to upload remaining screenshots:', error?.message || error);
        // Continue with base64 screenshots if upload fails
      }
    }

    this.recordedActions = finalActions;

    // Close browser
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }

    console.log(`✅ Recording stopped. Captured ${finalActions.length} actions.`);
    return finalActions;
  }

  /**
   * Convert raw recorded actions to micro-action format with VISUAL DATA
   * @param {Array} recordedActions - Raw actions from recorder
   * @returns {Array} Array of micro-action objects with visual field
   */
  convertToMicroActions(recordedActions) {
    return convertToMicroActions(recordedActions);
  }

  /**
   * Validate that visual data contains required fields
   * @param {Object} visual - Visual data object
   * @returns {boolean} True if valid
   */
  validateVisualData(visual) {
    return validateVisualData(visual);
  }

  /**
   * Replace actual values with template variables (static method)
   * @param {string} value - Actual value
   * @param {Object} elementInfo - Element information
   * @returns {string} Template variable or original value
   */
  static replaceWithTemplate(value, elementInfo) {
    return replaceWithTemplate(value, elementInfo);
  }
}
