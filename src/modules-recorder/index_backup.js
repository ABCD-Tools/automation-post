import puppeteer from 'puppeteer-core';
import { findChrome } from '../modules-agents/utils/browser.js';
import recorderScriptBackup from './recorderScriptBackup.js';

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
    this.lastUrl = null; // Track last URL for navigation detection
    this.navigationCount = 0; // Count navigation events
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
      const executablePath = findChrome();
      console.log('🔍 Found Chrome at:', executablePath);

      // Platform-specific configuration
      const platformConfig = {
        instagram: {
          protocolTimeout: 180000, // 3 minutes for heavy SPA
          navigationStabilityWait: 5000,
        },
        facebook: {
          protocolTimeout: 120000, // 2 minutes
          navigationStabilityWait: 3000,
        },
        default: {
          protocolTimeout: 60000, // 1 minute default
          navigationStabilityWait: 1000,
        }
      };
      
      const config = platformConfig[platform] || platformConfig.default;
      this.platformConfig = config;

      // Launch browser in visible mode (without auto-opening DevTools)
      this.browser = await puppeteer.launch({
        executablePath,
        headless: false,
        protocolTimeout: config.protocolTimeout, // Increased for heavy SPAs like Instagram
        // Removed devtools: true - user can open manually with F12 if needed
        args: [
          '--window-size=1920,1080',
          '--start-maximized',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-dev-shm-usage', // Prevents shared memory issues
        ],
      });

      this.page = await this.browser.newPage();
      
      // Platform-specific viewport: Instagram/Facebook use mobile, Twitter uses desktop
      if (platform) {
        // Use mobile emulation for Instagram/Facebook (better UX, cleaner layout)
        console.log('📱 Using mobile viewport for', platform);
        await this.page.emulate({
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
      } else if (platform === 'twitter') {
        // Use desktop viewport for Twitter
        console.log('🖥️  Using desktop viewport for', platform);
        await this.page.setViewport({ width: 1280, height: 720 });
      } else {
        // Default to desktop viewport
        await this.page.setViewport({ width: 1280, height: 720 });
      }

      // Navigate to URL FIRST
      console.log('🌐 Navigating to:', url);
      await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for page to be interactive
      await this.page.waitForFunction(() => {
        return document.readyState === 'complete' && document.body !== null;
      }, { timeout: 10000 }).catch(() => {
        console.warn('⚠️ Page interactive check timed out, continuing anyway...');
      });

      // Inject recorder script AFTER page loads (critical fix)
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
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
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
            this.backupActions = actions; // Store in memory
            if (actions.length > 0) {
              console.log(`🔄 Synced ${actions.length} actions to backup`);
            }
          }
        } catch (error) {
          // Silently ignore errors (page might be navigating)
        }
      }, 5000); // Every 5 seconds

      // Initialize lastUrl and store platform
      this.lastUrl = url;
      this.currentPlatform = platform;

      // Smart navigation detection with SPA handling
      this.page.on('framenavigated', async (frame) => {
        if (frame !== this.page.mainFrame()) return;
        
        try {
          const currentUrl = this.page.url();
          
          // Skip if URL hasn't changed (React re-render, not navigation)
          if (currentUrl === this.lastUrl) {
            console.log('   ⏭️ Skipping re-render (same URL)');
            return;
          }
          
          this.navigationCount++;
          console.log(`🧭 Navigation ${this.navigationCount} detected:`);
          console.log('   - From:', this.lastUrl);
          console.log('   - To:', currentUrl);
          
          // Check if we should re-inject
          if (this.shouldReinject(currentUrl)) {
            console.log('   - Will re-inject: true');
            
            // Wait for page stability before re-injection
            await this.waitForPageStability();
            
            // Instagram-specific: wait for login completion
            if (this.currentPlatform === 'instagram' && 
                this.lastUrl?.includes('/accounts/login/') && 
                !currentUrl.includes('/accounts/login/')) {
              await this.waitForLoginCompletion();
            }
            
            // Re-inject with graceful degradation
            await this.reinjectRecorderScript();
          } else {
            console.log('   ⏭️ Skipping re-injection (same domain SPA route)');
          }
          
          this.lastUrl = currentUrl;
        } catch (error) {
          console.warn('⚠️ Navigation handler error:', error.message);
        }
      });

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
    const waitTime = timeout || (this.platformConfig?.navigationStabilityWait || 10000);
    console.log('   ⏳ Waiting for page stability...');
    
    try {
      // Wait for network to be idle (Puppeteer doesn't have waitForNetworkIdle by default)
      // Use a custom implementation
      const startTime = Date.now();
      let lastRequestCount = 0;
      let idleCount = 0;
      
      while (Date.now() - startTime < waitTime) {
        const requestCount = await this.page.evaluate(() => {
          return performance.getEntriesByType('resource').length;
        });
        
        if (requestCount === lastRequestCount) {
          idleCount++;
          if (idleCount >= 2) { // 2 checks = ~1 second of idle
            break;
          }
        } else {
          idleCount = 0;
        }
        
        lastRequestCount = requestCount;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Wait for no DOM mutations for 500ms
      await this.page.evaluate(() => {
        return new Promise((resolve) => {
          let timer;
          const observer = new MutationObserver(() => {
            clearTimeout(timer);
            timer = setTimeout(() => {
              observer.disconnect();
              resolve();
            }, 500);
          });
          
          if (document.body) {
            observer.observe(document.body, {
              childList: true,
              subtree: true
            });
          }
          
          // Initial timer
          timer = setTimeout(() => {
            observer.disconnect();
            resolve();
          }, 500);
        });
      });
      
      console.log('   ✅ Page is stable');
      return true;
      
    } catch (error) {
      console.log('   ⚠️ Stability timeout, proceeding anyway');
      return false;
    }
  }

  /**
   * Determine if recorder should be re-injected after navigation
   * @param {string} url - Current URL
   * @returns {boolean} True if should re-inject
   */
  shouldReinject(url) {
    if (!this.lastUrl) return true;
    
    try {
      const previousDomain = new URL(this.lastUrl).hostname;
      const currentDomain = new URL(url).hostname;
      
      // Re-inject on different domain
      if (previousDomain !== currentDomain) return true;
      
      // Instagram-specific: re-inject after login
      if (this.lastUrl.includes('/accounts/login/') && !url.includes('/accounts/login/')) {
        return true; // Navigating FROM login, definitely re-inject
      }
      
      // Skip re-injection for same-domain SPA routes (unless login transition)
      return false;
    } catch (error) {
      // If URL parsing fails, default to re-injecting
      return true;
    }
  }

  /**
   * Wait for Instagram login completion
   * @returns {Promise<boolean>} True if login detected, false if timeout
   */
  async waitForLoginCompletion() {
    console.log('🔐 Detecting Instagram login...');
    
    try {
      await this.page.waitForFunction(
        () => {
          // Instagram removes login form and shows feed
          return !document.querySelector('input[name="username"]') &&
                 (window.location.pathname === '/' || 
                  window.location.pathname.startsWith('/reels') ||
                  window.location.pathname.startsWith('/explore'));
        },
        { timeout: 30000 }
      );
      
      console.log('✅ Login completed, waiting for feed load...');
      await this.waitForPageStability(15000); // Longer wait for feed
      return true;
      
    } catch (error) {
      console.log('⚠️ Login detection timeout');
      return false;
    }
  }

  /**
   * Re-inject recorder script with graceful degradation
   * @returns {Promise<void>}
   */
  async reinjectRecorderScript() {
    try {
      console.log('🔄 Re-injecting recorder script...');
      
      // Get previous actions with retry
      const previousActions = await this.getRecordedActions(3);
      
      // Re-inject script
      await this.injectRecorderScript();
      
      // Restore previous actions
      if (previousActions && previousActions.length > 0) {
        await this.page.evaluate((actions) => {
          window.__recordedActions = actions;
          console.log('✅ Restored ' + actions.length + ' previous actions');
        }, previousActions);
        
        // Update backup
        this.backupActions = previousActions;
      }
      
      this.injectionSuccess = true;
      
    } catch (error) {
      console.log('⚠️ Re-injection failed:', error.message);
      console.log('💡 Continuing with backup actions only');
      this.injectionSuccess = false;
      
      // Don't throw - gracefully degrade
      // Backup system will handle it
    }
  }

  /**
   * Inject comprehensive recorder script with VISUAL DATA CAPTURE
   * Captures screenshots, coordinates, text, and surrounding context
   */
  async injectRecorderScript() {
    const recorderScript = recorderScriptBackup;

    // Inject into current page (we inject after page load, so no need for evaluateOnNewDocument)
    await this.page.evaluate(recorderScript);
  }

  /**
   * Get recorded actions from the page
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
        
        throw error; // Re-throw non-timeout errors
      }
    }
    
    console.log('   💡 All retries exhausted, using backup');
    return this.backupActions || [];
  }

  /**
   * Server-side: Capture click action with comprehensive visual data
   * 
   * Captures:
   * - Element screenshot (using Puppeteer)
   * - Context screenshot (100px padding around element)
   * - Element text content
   * - Absolute and relative coordinates
   * - Element bounding box
   * - Surrounding text (parent, siblings)
   * - Backup DOM selector
   * 
   * @param {ElementHandle} elementHandle - Puppeteer element handle
   * @param {number} clientX - Click X coordinate
   * @param {number} clientY - Click Y coordinate
   * @returns {Promise<Object>} Action object with visual data
   * @throws {Error} If element capture fails
   */
  async captureClick(elementHandle, clientX, clientY) {
    try {
      const elementData = await elementHandle.evaluate((el, x, y) => {
        const rect = el.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        return {
          text: el.textContent?.trim().substring(0, 200) || '',
          boundingBox: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
          position: {
            absolute: {
              x: Math.round(x),
              y: Math.round(y),
            },
            relative: {
              x: parseFloat(((x / viewportWidth) * 100).toFixed(2)),
              y: parseFloat(((y / viewportHeight) * 100).toFixed(2)),
            },
          },
          viewport: {
            width: viewportWidth,
            height: viewportHeight,
          },
        };
      }, clientX, clientY);

      // Capture element screenshot
      const screenshot = await this.screenshotElement(elementHandle);

      // Capture surrounding area screenshot (100px padding)
      const contextScreenshot = await this.screenshotArea(elementHandle, 100);

      // Get surrounding text
      const surroundingText = await this.getSurroundingText(elementHandle);

      // Generate backup selector
      const backupSelector = await this.generateSelector(elementHandle);

      return {
        type: 'click',
        timestamp: Date.now(),
        visual: {
          screenshot: screenshot,
          contextScreenshot: contextScreenshot,
          text: elementData.text,
          position: elementData.position,
          boundingBox: elementData.boundingBox,
          surroundingText: surroundingText,
          timestamp: Date.now(),
          viewport: elementData.viewport,
        },
        backup_selector: backupSelector,
        execution_method: 'visual_first',
      };
    } catch (error) {
      console.error('Failed to capture click:', error);
      throw error;
    }
  }

  /**
   * Server-side: Capture element screenshot using Puppeteer
   * This is more reliable than client-side html2canvas
   * @param {ElementHandle} elementHandle - Puppeteer element handle
   * @returns {Promise<string|null>} Base64 data URL or null
   */
  async screenshotElement(elementHandle) {
    try {
      // Check if element is visible
      const isVisible = await elementHandle.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

      if (!isVisible) {
        console.warn('Element not visible for screenshot');
        return null;
      }

      const screenshot = await elementHandle.screenshot({
        encoding: 'base64',
        type: 'png',
      });
      return `data:image/png;base64,${screenshot}`;
    } catch (error) {
      console.warn('Failed to screenshot element with Puppeteer:', error);
      return null;
    }
  }

  /**
   * Server-side: Capture screenshot of area around element (with padding)
   * @param {ElementHandle} elementHandle - Puppeteer element handle
   * @param {number} padding - Padding in pixels (default 100)
   * @returns {Promise<string|null>} Base64 data URL or null
   */
  async screenshotArea(elementHandle, padding = 100) {
    try {
      const areaData = await elementHandle.evaluate((el, pad) => {
        const rect = el.getBoundingClientRect();
        return {
          x: Math.max(0, Math.round(rect.x - pad)),
          y: Math.max(0, Math.round(rect.y - pad)),
          width: Math.round(rect.width + pad * 2),
          height: Math.round(rect.height + pad * 2),
        };
      }, padding);

      // Use page screenshot with clip for area around element
      const screenshot = await this.page.screenshot({
        encoding: 'base64',
        type: 'jpeg',
        quality: 70,
        clip: areaData,
      });

      return `data:image/jpeg;base64,${screenshot}`;
    } catch (error) {
      console.warn('Failed to screenshot area:', error);
      return null;
    }
  }

  /**
   * Server-side: Get surrounding text from parent and siblings
   * @param {ElementHandle} elementHandle - Puppeteer element handle
   * @returns {Promise<string[]>} Array of surrounding text (max 5 items)
   */
  async getSurroundingText(elementHandle) {
    try {
      const surroundingText = await elementHandle.evaluate((el) => {
        const texts = [];

        // Get parent text
        if (el.parentElement) {
          const parentText = el.parentElement.textContent?.trim();
          if (parentText && parentText.length > 0 && parentText.length < 100) {
            texts.push(parentText.substring(0, 100));
          }
        }

        // Get previous sibling text
        let prevSibling = el.previousElementSibling;
        if (prevSibling) {
          const prevText = prevSibling.textContent?.trim();
          if (prevText && prevText.length > 0 && prevText.length < 100) {
            texts.push(prevText.substring(0, 100));
          }
        }

        // Get next sibling text
        let nextSibling = el.nextElementSibling;
        if (nextSibling) {
          const nextText = nextSibling.textContent?.trim();
          if (nextText && nextText.length > 0 && nextText.length < 100) {
            texts.push(nextText.substring(0, 100));
          }
        }

        // Get aria-label or placeholder as context
        const ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel) {
          texts.push('aria:' + ariaLabel);
        }

        const placeholder = el.getAttribute('placeholder');
        if (placeholder) {
          texts.push('placeholder:' + placeholder);
        }

        return texts.slice(0, 5); // Max 5 items
      });

      return surroundingText;
    } catch (error) {
      console.warn('Failed to get surrounding text:', error);
      return [];
    }
  }

  /**
   * Server-side: Generate backup CSS selector (fallback only)
   * @param {ElementHandle} elementHandle - Puppeteer element handle
   * @returns {Promise<string|null>} CSS selector or null
   */
  async generateSelector(elementHandle) {
    try {
      const selector = await elementHandle.evaluate((el) => {
        if (!el || !el.tagName) return null;

        // Priority 1: ID selector
        if (el.id) {
          const idSelector = '#' + CSS.escape(el.id);
          if (document.querySelectorAll(idSelector).length === 1) {
            return idSelector;
          }
        }

        // Priority 2: Name attribute (for inputs)
        if (el.name) {
          const nameSelector = el.tagName.toLowerCase() + '[name="' + CSS.escape(el.name) + '"]';
          if (document.querySelectorAll(nameSelector).length === 1) {
            return nameSelector;
          }
        }

        // Priority 3: Placeholder (for inputs)
        if (el.placeholder) {
          const placeholderSelector = el.tagName.toLowerCase() + '[placeholder="' + CSS.escape(el.placeholder) + '"]';
          if (document.querySelectorAll(placeholderSelector).length === 1) {
            return placeholderSelector;
          }
        }

        // Priority 4: Data attributes
        if (el.dataset.testid) {
          const testIdSelector = el.tagName.toLowerCase() + '[data-testid="' + CSS.escape(el.dataset.testid) + '"]';
          if (document.querySelectorAll(testIdSelector).length === 1) {
            return testIdSelector;
          }
        }
        if (el.dataset.id) {
          const dataIdSelector = el.tagName.toLowerCase() + '[data-id="' + CSS.escape(el.dataset.id) + '"]';
          if (document.querySelectorAll(dataIdSelector).length === 1) {
            return dataIdSelector;
          }
        }

        // Priority 5: ARIA labels
        if (el.getAttribute('aria-label')) {
          const ariaSelector = el.tagName.toLowerCase() + '[aria-label="' + CSS.escape(el.getAttribute('aria-label')) + '"]';
          if (document.querySelectorAll(ariaSelector).length === 1) {
            return ariaSelector;
          }
        }

        // Priority 6: Class combination (if unique)
        if (el.className && typeof el.className === 'string') {
          const classes = el.className.trim().split(/\s+/).filter(c => c);
          if (classes.length > 0) {
            const classSelector = el.tagName.toLowerCase() + '.' + classes.join('.');
            if (document.querySelectorAll(classSelector).length === 1) {
              return classSelector;
            }
          }
        }

        // Priority 7: Last resort - nth-child path
        let path = [];
        let current = el;
        while (current && current !== document.body) {
          let selector = current.tagName.toLowerCase();
          if (current.id) {
            selector += '#' + CSS.escape(current.id);
            path.unshift(selector);
            break;
          }
          let sibling = current;
          let nth = 1;
          while (sibling.previousElementSibling) {
            sibling = sibling.previousElementSibling;
            if (sibling.tagName === current.tagName) {
              nth++;
            }
          }
          selector += ':nth-child(' + nth + ')';
          path.unshift(selector);
          current = current.parentElement;
        }
        return path.join(' > ');
      });

      return selector;
    } catch (error) {
      console.warn('Failed to generate selector:', error);
      return null;
    }
  }

  /**
   * Server-side: Capture type/input action with visual data
   * 
   * Captures:
   * - Screenshot of input field
   * - Placeholder text
   * - Input type (text, password, email, etc.)
   * - Visual position data
   * - Auto-detects sensitive fields (username, password, email)
   * - Auto-replaces values with template variables:
   *   - username/user/login → {{username}}
   *   - password → {{password}}
   *   - email → {{email}}
   *   - caption/post/content → {{caption}}
   * - Backup selector
   * 
   * @param {ElementHandle} elementHandle - Puppeteer element handle
   * @param {string} value - Input value (will be templated if sensitive)
   * @returns {Promise<Object>} Action object with visual data and templated value
   * @throws {Error} If element capture fails
   */
  async captureType(elementHandle, value) {
    try {
      const elementData = await elementHandle.evaluate((el, val) => {
        const rect = el.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Detect field type
        const isPassword = el.type === 'password' || 
                          (el.name && /password/i.test(el.name)) ||
                          (el.id && /password/i.test(el.id));
        const isUsername = (el.name && /username|user|login/i.test(el.name)) ||
                          (el.id && /username|user|login/i.test(el.id)) ||
                          (el.placeholder && /username|user|login/i.test(el.placeholder));
        const isEmail = el.type === 'email' ||
                       (el.name && /email|e-mail/i.test(el.name)) ||
                       (el.id && /email|e-mail/i.test(el.id)) ||
                       (el.placeholder && /email|e-mail/i.test(el.placeholder));

        // Auto-replace sensitive values with template variables
        let templateValue = val;
        if (isPassword) {
          templateValue = '{{password}}';
        } else if (isUsername) {
          templateValue = '{{username}}';
        } else if (isEmail) {
          templateValue = '{{email}}';
        } else if (el.tagName === 'TEXTAREA' || (el.name && /caption|post|content|message/i.test(el.name))) {
          templateValue = '{{caption}}';
        }

        return {
          text: el.textContent?.trim() || '',
          placeholder: el.placeholder || '',
          inputType: el.type || 'text',
          templateValue: templateValue,
          isPassword,
          isUsername,
          isEmail,
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
            relative: {
              x: parseFloat((((rect.left + rect.width / 2) / viewportWidth) * 100).toFixed(2)),
              y: parseFloat((((rect.top + rect.height / 2) / viewportHeight) * 100).toFixed(2)),
            },
          },
          viewport: {
            width: viewportWidth,
            height: viewportHeight,
          },
        };
      }, value);

      // Capture screenshot of input field
      const screenshot = await this.screenshotElement(elementHandle);

      // Get surrounding text
      const surroundingText = await this.getSurroundingText(elementHandle);

      // Generate backup selector
      const backupSelector = await this.generateSelector(elementHandle);

      return {
        type: 'type',
        timestamp: Date.now(),
        visual: {
          screenshot: screenshot,
          text: elementData.text,
          placeholder: elementData.placeholder,
          inputType: elementData.inputType,
          position: elementData.position,
          boundingBox: elementData.boundingBox,
          surroundingText: surroundingText,
          timestamp: Date.now(),
          viewport: elementData.viewport,
        },
        backup_selector: backupSelector,
        value: elementData.templateValue,
        execution_method: 'visual_first',
      };
    } catch (error) {
      console.error('Failed to capture type:', error);
      throw error;
    }
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
   * Use this for more reliable data capture on server
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
    const finalActions = liveActions.length > 0 ? liveActions : (this.backupActions || []);
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
    const microActions = [];
    let lastTypingAction = null;

    for (let i = 0; i < recordedActions.length; i++) {
      const action = recordedActions[i];
      const prevAction = i > 0 ? recordedActions[i - 1] : null;
      const timeSincePrev = prevAction ? action.timestamp - prevAction.timestamp : 0;
      const lastMicroAction = microActions.length > 0 ? microActions[microActions.length - 1] : null;

      // Add automatic wait between actions (1-2 seconds, randomized)
      if (
        prevAction &&
        timeSincePrev < 2000 &&
        (!lastMicroAction || lastMicroAction.type !== 'wait')
      ) {
        const waitDuration = 1000 + Math.random() * 1000; // 1-2 seconds
        microActions.push({
          name: 'Wait between actions',
          type: 'wait',
          params: {
            duration: Math.round(waitDuration),
            randomize: true,
          },
        });
      }

      switch (action.type) {
        case 'click': {
          // Validate visual data is present
          if (!action.visual || !this.validateVisualData(action.visual)) {
            console.warn('⚠️ Click action missing visual data, skipping:', action);
            break;
          }

          // Structure visual data according to requirements
          const visualData = {
            screenshot: action.visual.screenshot || null,
            contextScreenshot: action.visual.contextScreenshot || null,
            text: action.visual.text || '',
            position: {
              absolute: action.visual.position?.absolute || { x: 0, y: 0 },
              relative: action.visual.position?.relative || { x: 0, y: 0 },
            },
            boundingBox: action.visual.boundingBox || { x: 0, y: 0, width: 0, height: 0 },
            surroundingText: action.visual.surroundingText || [],
            timestamp: action.visual.timestamp || action.timestamp,
          };

          microActions.push({
            name: `Click "${visualData.text.substring(0, 30) || 'element'}"`,
            type: 'click',
            visual: visualData,
            backup_selector: action.backup_selector || null,
            execution_method: action.execution_method || 'visual_first',
          });
          break;
        }

        case 'type': {
          // Validate visual data is present
          if (!action.visual || !this.validateVisualData(action.visual)) {
            console.warn('⚠️ Type action missing visual data, skipping:', action);
            break;
          }

          // Merge consecutive typing on same element
          if (
            lastTypingAction &&
            lastTypingAction.backup_selector === action.backup_selector
          ) {
            // Update the last typing action with new value
            lastTypingAction.visual.text = action.value || action.visual.text;
            lastTypingAction.name = `Type in "${action.visual.placeholder || action.element?.name || 'field'}"`;
          } else {
            // Structure visual data according to requirements
            const visualData = {
              screenshot: action.visual.screenshot || null,
              contextScreenshot: action.visual.contextScreenshot || null,
              text: action.visual.text || '',
              placeholder: action.visual.placeholder || '',
              inputType: action.visual.inputType || 'text',
              position: {
                absolute: action.visual.position?.absolute || { x: 0, y: 0 },
                relative: action.visual.position?.relative || { x: 0, y: 0 },
              },
              boundingBox: action.visual.boundingBox || { x: 0, y: 0, width: 0, height: 0 },
              surroundingText: action.visual.surroundingText || [],
              timestamp: action.visual.timestamp || action.timestamp,
            };

            const microAction = {
              name: `Type in "${visualData.placeholder || action.element?.name || 'field'}"`,
              type: 'type',
              visual: visualData,
              backup_selector: action.backup_selector || null,
              text: action.value || '', // Already templated in capture
              execution_method: action.execution_method || 'visual_first',
            };
            microActions.push(microAction);
            lastTypingAction = microAction;
          }
          break;
        }

        case 'navigate': {
          microActions.push({
            name: `Navigate to ${action.url}`,
            type: 'navigate',
            params: {
              url: action.url,
              waitUntil: 'networkidle2',
            },
          });
          break;
        }

        case 'upload': {
          // Structure visual data if available
          const visualData = action.visual ? {
            screenshot: action.visual.screenshot || null,
            contextScreenshot: action.visual.contextScreenshot || null,
            text: action.visual.text || '',
            position: {
              absolute: action.visual.position?.absolute || { x: 0, y: 0 },
              relative: action.visual.position?.relative || { x: 0, y: 0 },
            },
            boundingBox: action.visual.boundingBox || { x: 0, y: 0, width: 0, height: 0 },
            surroundingText: action.visual.surroundingText || [],
            timestamp: action.visual.timestamp || action.timestamp,
          } : null;

          microActions.push({
            name: 'Upload file',
            type: 'upload',
            visual: visualData,
            backup_selector: action.backup_selector || null,
            filePath: '{{imagePath}}',
            execution_method: 'visual_first',
          });
          break;
        }

        case 'scroll': {
          microActions.push({
            name: `Scroll ${action.direction}`,
            type: 'scroll',
            params: {
              direction: action.direction,
              amount: action.amount,
            },
          });
          break;
        }

        case 'submit': {
          // Submit is usually handled by clicking submit button
          break;
        }
      }
    }

    // Validate all required visual fields are present
    const validatedActions = microActions.map(action => {
      if (action.visual && !this.validateVisualData(action.visual)) {
        console.warn('⚠️ Action missing required visual fields:', action);
        // Remove visual data if invalid, keep backup_selector
        return {
          ...action,
          visual: null,
          execution_method: 'selector_first', // Fallback to selector
        };
      }
      return action;
    });

    console.log(`✅ Converted ${recordedActions.length} raw actions to ${validatedActions.length} micro-actions with visual data`);
    return validatedActions;
  }

  /**
   * Validate that visual data contains required fields
   * @param {Object} visual - Visual data object
   * @returns {boolean} True if valid
   */
  validateVisualData(visual) {
    if (!visual) return false;

    const hasPosition = visual.position && 
                       visual.position.absolute && 
                       typeof visual.position.absolute.x === 'number' &&
                       typeof visual.position.absolute.y === 'number';

    const hasBoundingBox = visual.boundingBox &&
                          typeof visual.boundingBox.x === 'number' &&
                          typeof visual.boundingBox.y === 'number' &&
                          typeof visual.boundingBox.width === 'number' &&
                          typeof visual.boundingBox.height === 'number';

    const hasTimestamp = typeof visual.timestamp === 'number';

    // Screenshot is optional but recommended
    const hasScreenshot = typeof visual.screenshot === 'string' && visual.screenshot.length > 0;

    // Must have position, bounding box, and timestamp
    // Screenshot is nice to have but not required
    return hasPosition && hasBoundingBox && hasTimestamp;
  }

  /**
   * Replace actual values with template variables
   * @param {string} value - Actual value
   * @param {Object} elementInfo - Element information
   * @returns {string} Template variable or original value
   */
  static replaceWithTemplate(value, elementInfo) {
    if (!value) return '';

    // Password fields
    if (
      elementInfo.type === 'password' ||
      (elementInfo.name && /password/i.test(elementInfo.name)) ||
      (elementInfo.id && /password/i.test(elementInfo.id))
    ) {
      return '{{password}}';
    }

    // Username fields
    if (
      (elementInfo.name && /username|user|login/i.test(elementInfo.name)) ||
      (elementInfo.id && /username|user|login/i.test(elementInfo.id)) ||
      (elementInfo.placeholder && /username|user|login/i.test(elementInfo.placeholder))
    ) {
      return '{{username}}';
    }

    // Email fields
    if (
      elementInfo.type === 'email' ||
      (elementInfo.name && /email|e-mail/i.test(elementInfo.name)) ||
      (elementInfo.id && /email|e-mail/i.test(elementInfo.id)) ||
      (elementInfo.placeholder && /email|e-mail/i.test(elementInfo.placeholder))
    ) {
      return '{{email}}';
    }

    // Text areas and content inputs (likely captions/posts)
    if (elementInfo.tag === 'textarea' || (elementInfo.name && /caption|post|content|message|text/i.test(elementInfo.name))) {
      return '{{caption}}';
    }

    // Return original value if no template match
    return value;
  }
}

