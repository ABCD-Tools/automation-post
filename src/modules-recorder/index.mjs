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
  }

  /**
   * Start recording actions on a given URL
   * @param {string} url - URL to navigate to
   * @param {string} platform - Platform name (instagram, facebook, twitter)
   * @returns {Promise<Object>} Session info
   */
  async startRecording(url, platform) {
    try {
      // Launch browser with platform-specific configuration
      const { browser, page, config } = await launchBrowser(platform);
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

      // Set up periodic action syncing (backup strategy)
      this.syncInterval = setInterval(async () => {
        try {
          if (this.page && !this.page.isClosed()) {
            const actions = await this.page.evaluate(() => {
              return window.__recordedActions || [];
            });
            this.backupActions = actions;
            if (actions.length > 0) {
              console.log(`🔄 Synced ${actions.length} actions to backup`);
            }
          }
        } catch (error) {
          // Silently ignore errors (page might be navigating)
        }
      }, 5000);

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
   * Server-side enrichment pass:
   * For recorded actions that are missing screenshots, use Puppeteer + backup
   * selectors to capture real visual.screenshot/contextScreenshot where possible.
   * 
   * This runs just before we close the browser, so it can still query the DOM.
   * 
   * IMPORTANT: Actions recorded on different pages (e.g., login page) won't be
   * enrichable if we're now on a different page (e.g., feed page). We try to
   * navigate back to the action's original page if needed.
   * 
   * @param {Array} recordedActions
   * @returns {Promise<Array>} enriched actions
   */
  async enrichRecordedActionsWithPuppeteer(recordedActions) {
    // If page is gone, we can't enrich – just return original actions
    if (!this.page) {
      console.log('📸 Enrichment skipped: page is null');
      return recordedActions;
    }
    try {
      if (this.page.isClosed()) {
        console.log('📸 Enrichment skipped: page is closed');
        return recordedActions;
      }
    } catch {
      console.log('📸 Enrichment skipped: page check failed');
      return recordedActions;
    }

    console.log(`📸 Starting Puppeteer enrichment pass for ${recordedActions.length} actions...`);
    const currentUrl = this.page.url();
    console.log(`   Current page URL: ${currentUrl}`);

    // Precompute type groups per selector so we can detect
    // \"first time type\" and \"after stop type\".
    const firstTypeIndexBySelector = new Map();
    const lastTypeIndexBySelector = new Map();
    for (let i = 0; i < recordedActions.length; i++) {
      const a = recordedActions[i];
      if (a && a.type === 'type' && a.backup_selector) {
        const sel = a.backup_selector;
        if (!firstTypeIndexBySelector.has(sel)) {
          firstTypeIndexBySelector.set(sel, i);
        }
        lastTypeIndexBySelector.set(sel, i);
      }
    }

    const enriched = [];
    let enrichedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;

    for (let i = 0; i < recordedActions.length; i++) {
      const action = recordedActions[i];

      const hasScreenshot =
        !!action?.visual?.screenshot || !!action?.visual?.contextScreenshot;

      // Handle page-level screenshots for navigations:
      // - first time site loaded (initial navigate)
      // - after change url (subsequent navigate actions)
      if (action.type === 'navigate') {
        if (hasScreenshot) {
          enriched.push(action);
          skippedCount++;
          continue;
        }

        try {
          const targetUrl = action.url || currentUrl;
          if (targetUrl && targetUrl.startsWith('http')) {
            console.log(`   🌐 Enriching navigation action ${i + 1} with full-page screenshot for URL: ${targetUrl}`);
            try {
              if (this.page.url() !== targetUrl) {
                await this.page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 15000 });
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            } catch (navErr) {
              console.warn(`   ⚠️ Navigation action ${i + 1}: failed to navigate before screenshot:`, navErr?.message || navErr);
            }
          }

          const pageShot = await this.page.screenshot({
            encoding: 'base64',
            type: 'png',
            fullPage: true,
          });

          if (pageShot) {
            enrichedCount++;
            console.log(`   ✅ Navigation action ${i + 1} enriched with full-page screenshot`);
            enriched.push({
              ...action,
              visual: {
                ...(action.visual || {}),
                screenshot: `data:image/png;base64,${pageShot}`,
                timestamp: Date.now(),
              },
            });
          } else {
            console.log(`   ⚠️ Navigation action ${i + 1}: page screenshot was empty`);
            enriched.push(action);
          }
        } catch (navShotError) {
          console.warn(`   ⚠️ Failed to enrich navigation action ${i + 1}, keeping original:`, navShotError?.message || navShotError);
          enriched.push(action);
        }
        continue;
      }

      // Only enrich click/type element actions that have a backup selector and no screenshots yet
      const isClickableType = action.type === 'click' || action.type === 'type';
      const hasSelector = !!action.backup_selector;

      if (!isClickableType || !hasSelector || hasScreenshot) {
        enriched.push(action);
        skippedCount++;
        continue;
      }

      try {
        // Check if action was recorded on a different page - if so, try to navigate back
        const actionUrl = action.url || currentUrl;
        const needsNavigation = actionUrl !== currentUrl && actionUrl.startsWith('http');
        
        if (needsNavigation) {
          console.log(`   🔄 Action ${i + 1} was on different page, navigating to: ${actionUrl}`);
          try {
            await this.page.goto(actionUrl, { waitUntil: 'networkidle2', timeout: 15000 });
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for page to stabilize
            console.log(`   ✅ Navigated to action's original page`);
          } catch (navError) {
            console.warn(`   ⚠️ Failed to navigate to action's page, trying current page: ${navError?.message || navError}`);
          }
        }

        const handle = await this.page.$(action.backup_selector);
        if (!handle) {
          console.log(`   ⚠️ Action ${i + 1} (${action.type}): selector not found: ${action.backup_selector?.substring(0, 50)}...`);
          enriched.push(action);
          notFoundCount++;
          continue;
        }

        console.log(`   📸 Enriching action ${i + 1} (${action.type})...`);

        if (action.type === 'click') {
          const absPos = action.visual?.position?.absolute || {};
          const clientX = typeof absPos.x === 'number' ? absPos.x : undefined;
          const clientY = typeof absPos.y === 'number' ? absPos.y : undefined;

          if (clientX == null || clientY == null) {
            console.log(`   ⚠️ Action ${i + 1}: missing click coordinates`);
            enriched.push(action);
            skippedCount++;
            continue;
          }

          const enrichedClick = await this.captureClick(handle, clientX, clientY);

          // Check if screenshot was actually captured
          const hasScreenshotNow = !!(enrichedClick.visual?.screenshot || enrichedClick.visual?.contextScreenshot);
          if (hasScreenshotNow) {
            enrichedCount++;
            console.log(`   ✅ Action ${i + 1} enriched with screenshot`);
          } else {
            console.log(`   ⚠️ Action ${i + 1} enrichment completed but no screenshot captured`);
          }

          // Merge: keep original high-level fields, but override visual + backup_selector/exec method if provided
          enriched.push({
            ...action,
            visual: {
              ...(action.visual || {}),
              ...(enrichedClick.visual || {}),
            },
            backup_selector: action.backup_selector || enrichedClick.backup_selector,
            execution_method: action.execution_method || enrichedClick.execution_method,
          });
        } else if (action.type === 'type') {
          const sel = action.backup_selector;
          const firstIdx = firstTypeIndexBySelector.get(sel);
          const lastIdx = lastTypeIndexBySelector.get(sel);
          const isFirstType = firstIdx === i;
          const isLastType = lastIdx === i;

          // Only screenshot for \"first time type\" and \"after stop type\"
          if (!isFirstType && !isLastType) {
            console.log(`   ⏭️ Skipping type action ${i + 1} for screenshot (not first/last for selector)`);
            enriched.push(action);
            skippedCount++;
            continue;
          }

          const value = action.value || '';
          const enrichedType = await this.captureType(handle, value);

          // Check if screenshot was actually captured
          const hasScreenshotNow = !!(enrichedType.visual?.screenshot);
          if (hasScreenshotNow) {
            enrichedCount++;
            console.log(`   ✅ Type action ${i + 1} (${isFirstType ? 'first' : 'last'}) enriched with screenshot`);
          } else {
            console.log(`   ⚠️ Type action ${i + 1} enrichment completed but no screenshot captured`);
          }

          enriched.push({
            ...action,
            visual: {
              ...(action.visual || {}),
              ...(enrichedType.visual || {}),
            },
            backup_selector: action.backup_selector || enrichedType.backup_selector,
            execution_method: action.execution_method || enrichedType.execution_method,
            value: enrichedType.value ?? action.value,
          });
        } else {
          enriched.push(action);
          skippedCount++;
        }
      } catch (error) {
        console.warn(`   ⚠️ Failed to enrich action ${i + 1} with Puppeteer, keeping original:`, error?.message || error);
        enriched.push(action);
        skippedCount++;
      }
    }

    console.log(`📸 Enrichment complete: ${enrichedCount} enriched, ${notFoundCount} not found, ${skippedCount} skipped`);
    return enriched;
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
   * Stop recording and close browser
   * @returns {Promise<Array>} Final recorded actions
   */
  async stopRecording() {
    this.isRecording = false;

    // Clear periodic sync interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Get final actions (try live first, fallback to backup)
    const liveActions = await this.getRecordedActions();
    
    // Use backup if live retrieval failed or returned empty
    let finalActions = liveActions.length > 0 ? liveActions : (this.backupActions || []);

    // Enrich with real Puppeteer screenshots before closing the browser
    try {
      finalActions = await this.enrichRecordedActionsWithPuppeteer(finalActions);
    } catch (error) {
      console.warn('⚠️ Failed to run Puppeteer enrichment pass:', error?.message || error);
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
