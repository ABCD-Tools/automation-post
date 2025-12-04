export const recorderScriptBackup = `
      (function() {
        try {
          // Prevent double injection
          if (window.__actionRecorderInjected) {
            console.log('⚠️ Recorder already initialized');
            return;
          }
          window.__actionRecorderInjected = true;

          // Storage for recorded actions
          if (!window.__recordedActions) {
            // Try to restore from sessionStorage first
            try {
              const stored = sessionStorage.getItem('__recordedActions');
              if (stored) {
                window.__recordedActions = JSON.parse(stored);
                console.log('✅ Restored ' + window.__recordedActions.length + ' actions from sessionStorage');
              } else {
                window.__recordedActions = [];
                console.log('✅ Recorder initialized');
              }
            } catch (e) {
              window.__recordedActions = [];
              console.log('✅ Recorder initialized (sessionStorage restore failed)');
            }
          } else {
            console.log('⚠️ Recorder already initialized');
          }

          // Sync to sessionStorage function
          function syncToStorage() {
            try {
              if (window.__recordedActions) {
                sessionStorage.setItem('__recordedActions', JSON.stringify(window.__recordedActions));
              }
            } catch (e) {
              console.warn('Failed to sync to sessionStorage:', e);
            }
          }

        // Load html2canvas dynamically (client-side screenshot capture)
        if (!window.html2canvas) {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
          script.onload = () => console.log('✅ html2canvas loaded for visual recording');
          document.head.appendChild(script);
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // RECORDING STATUS OVERLAY
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        // Get viewport info for positioning
        function getViewportInfo() {
          return {
            width: window.innerWidth,
            height: window.innerHeight,
            outerWidth: window.outerWidth,
            outerHeight: window.outerHeight
          };
        }

        // Create floating status overlay positioned outside viewport
        function createOverlay() {
          // Remove existing overlay if any
          const existing = document.getElementById('__recorder_overlay');
          if (existing) {
            existing.remove();
          }

          const viewportInfo = getViewportInfo();
          const viewportWidth = viewportInfo.width;
          const browserWidth = viewportInfo.outerWidth;
          const spaceOnRight = browserWidth - viewportWidth;

          const overlay = document.createElement('div');
          overlay.id = '__recorder_overlay';
          
          // Check if there's space outside viewport
          let positionStyle = '';
          if (spaceOnRight > 200) {
            // Plenty of space, position to the right of viewport
            positionStyle = 
              'position: fixed;' +
              'left: ' + (viewportWidth + 20) + 'px;' +
              'top: 20px;';
            console.log('📱 Notification positioned outside viewport (right side)');
          } else {
            // Not enough space, position at top center
            positionStyle = 
              'position: fixed;' +
              'top: 0;' +
              'left: 50%;' +
              'transform: translateX(-50%);';
            console.log('⚠️ Not enough space outside viewport, using top-center position');
          }

          overlay.style.cssText = positionStyle +
            'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);' +
            'color: white;' +
            'padding: 12px 20px;' +
            'border-radius: 8px;' +
            'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;' +
            'font-size: 14px;' +
            'font-weight: 600;' +
            'box-shadow: 0 4px 12px rgba(0,0,0,0.3);' +
            'z-index: 2147483647;' +
            'display: flex;' +
            'align-items: center;' +
            'gap: 10px;' +
            'pointer-events: none;' +
            'white-space: nowrap;';

          overlay.innerHTML = 
            '<span style="' +
              'width: 8px;' +
              'height: 8px;' +
              'background: #ff4444;' +
              'border-radius: 50%;' +
              'display: inline-block;' +
              'animation: pulse 1.5s ease-in-out infinite;' +
            '"></span>' +
            '<span id="__recorder_status">Recording...</span>' +
            '<span id="__recorder_count" style="' +
              'background: rgba(255,255,255,0.2);' +
              'padding: 2px 8px;' +
              'border-radius: 12px;' +
              'font-size: 12px;' +
            '">0 actions</span>';

          // Add pulse animation
          const style = document.createElement('style');
          style.textContent = 
            '@keyframes pulse {' +
              '0%, 100% { opacity: 1; }' +
              '50% { opacity: 0.3; }' +
            '}';
          document.head.appendChild(style);
          
          // Wait for body to exist before appending
          if (document.body) {
            document.body.appendChild(overlay);
          } else {
            // If body doesn't exist yet, wait for it
            const observer = new MutationObserver((mutations, obs) => {
              if (document.body) {
                document.body.appendChild(overlay);
                obs.disconnect();
              }
            });
            observer.observe(document.documentElement, {
              childList: true,
              subtree: true
            });
          }

          // Handle window resize
          window.addEventListener('resize', () => {
            const newViewportInfo = getViewportInfo();
            const newViewportWidth = newViewportInfo.width;
            const newBrowserWidth = newViewportInfo.outerWidth;
            const newSpaceOnRight = newBrowserWidth - newViewportWidth;
            
            if (newSpaceOnRight > 200) {
              overlay.style.left = (newViewportWidth + 20) + 'px';
              overlay.style.top = '20px';
              overlay.style.transform = 'none';
            } else {
              overlay.style.left = '50%';
              overlay.style.top = '0';
              overlay.style.transform = 'translateX(-50%)';
            }
            console.log('📱 Notification repositioned for new viewport width:', newViewportWidth);
          });
          
          return overlay;
        }

        // Create overlay
        const overlay = createOverlay();

        // Update overlay when actions captured
        function updateOverlay() {
          const count = window.__recordedActions ? window.__recordedActions.length : 0;
          const countElement = document.getElementById('__recorder_count');
          if (countElement) {
            countElement.textContent = count + ' action' + (count !== 1 ? 's' : '');
          }
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // VISUAL DATA CAPTURE HELPERS
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        /**
         * Capture element screenshot using html2canvas
         * @param {HTMLElement} element - Target element
         * @returns {Promise<string|null>} Base64 data URL or null
         */
        // Validate screenshot data
        function isValidScreenshot(dataUrl) {
          if (!dataUrl) return false;
          if (typeof dataUrl !== 'string') return false;
          if (!dataUrl.startsWith('data:image/')) return false;
          if (dataUrl.length < 100) return false; // Too short = empty image
          return true;
        }

        async function screenshotElement(element) {
          console.log('📸 Screenshot capture started');
          console.log('   - Element:', element.tagName, element.className || '(no class)');
          
          try {
            if (!window.html2canvas || !element || !element.getBoundingClientRect) {
              console.warn('   ❌ Prerequisites not met');
              return null;
            }

            // Check if element is visible
            const rect = element.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) {
              console.warn('   ⚠️ Element not visible for screenshot');
              return null;
            }

            console.log('   - Element size:', rect.width, 'x', rect.height);

            // Capture screenshot with mobile-optimized settings
            const canvas = await html2canvas(element, {
              logging: false,
              allowTaint: true,
              useCORS: true,
              backgroundColor: null,
              scale: window.devicePixelRatio || 1, // Match device pixel ratio
              width: rect.width,
              height: rect.height,
              foreignObjectRendering: false, // Disable if SVGs cause issues
              imageTimeout: 5000, // Wait for images to load
              ignoreElements: (el) => {
                // Skip our own notification
                if (el.id === '__recorder_overlay' || el.id === '__recorder_notification') return true;
                // Skip video elements (can't capture)
                if (el.tagName === 'VIDEO') return true;
                // Skip canvas elements (recursive capture issue)
                if (el.tagName === 'CANVAS') return true;
                return false;
              }
            });

            console.log('   - Canvas created:', canvas.width, 'x', canvas.height);

            let dataUrl = canvas.toDataURL('image/png', 0.8);
            console.log('   - DataURL length:', dataUrl.length);
            console.log('   - DataURL preview:', dataUrl.substring(0, 50) + '...');

            // Validate screenshot
            if (!isValidScreenshot(dataUrl)) {
              console.warn('   ⚠️ DataURL suspiciously short or invalid!');
              return null;
            }

            // Check size and compress if too large
            const sizeKB = Math.round((dataUrl.length * 3) / 4 / 1024);
            console.log('   📊 Screenshot size: ' + sizeKB + 'KB');

            // If too large, reduce quality
            if (sizeKB > 100) {
              console.log('   🗜️ Reducing quality to compress...');
              dataUrl = canvas.toDataURL('image/jpeg', 0.5); // JPEG, lower quality
              const newSizeKB = Math.round((dataUrl.length * 3) / 4 / 1024);
              console.log('   ✅ Compressed to ' + newSizeKB + 'KB');
            }

            console.log('   ✅ Screenshot captured successfully');
            return dataUrl;
          } catch (error) {
            console.error('   ❌ Screenshot failed:', error);
            return null;
          }
        }

        /**
         * Capture screenshot of area around element (with padding)
         * @param {HTMLElement} element - Target element
         * @param {number} padding - Padding in pixels (default 100)
         * @returns {Promise<string|null>} Base64 data URL or null
         */
        async function screenshotArea(element, padding = 100) {
          try {
            if (!window.html2canvas || !element) {
              return null;
            }

            const rect = element.getBoundingClientRect();
            const scrollX = window.scrollX || window.pageXOffset;
            const scrollY = window.scrollY || window.pageYOffset;
            
            // Calculate area bounds with padding
            const areaX = Math.max(0, rect.left + scrollX - padding);
            const areaY = Math.max(0, rect.top + scrollY - padding);
            const areaWidth = Math.min(window.innerWidth, rect.width + padding * 2);
            const areaHeight = Math.min(window.innerHeight, rect.height + padding * 2);

            // Find a container that includes the element and padding area
            let container = element;
            let attempts = 0;
            while (container && container !== document.body && attempts < 10) {
              const containerRect = container.getBoundingClientRect();
              const containerScrollX = container.scrollLeft || 0;
              const containerScrollY = container.scrollTop || 0;
              
              // Check if container contains the area we want to capture
              if (
                containerRect.left <= rect.left - padding &&
                containerRect.top <= rect.top - padding &&
                containerRect.right >= rect.right + padding &&
                containerRect.bottom >= rect.bottom + padding
              ) {
                break;
              }
              container = container.parentElement;
              attempts++;
            }

            // Fallback to body if no suitable container found
            if (!container || container === document.body) {
              container = document.body;
            }

            // Capture screenshot with lower scale for context (smaller file size)
            const canvas = await html2canvas(container, {
              logging: false,
              allowTaint: true,
              useCORS: true,
              scale: 0.5, // Lower scale for context screenshot
              x: areaX - (container.getBoundingClientRect().left + (container.scrollLeft || 0)),
              y: areaY - (container.getBoundingClientRect().top + (container.scrollTop || 0)),
              width: areaWidth,
              height: areaHeight,
              windowWidth: window.innerWidth,
              windowHeight: window.innerHeight,
            });

            return canvas.toDataURL('image/jpeg', 0.7); // JPEG for smaller size
          } catch (error) {
            console.warn('Failed to screenshot area:', error);
            return null;
          }
        }

        /**
         * Get surrounding text from parent and siblings
         * @param {HTMLElement} element - Target element
         * @returns {string[]} Array of surrounding text (max 5 items)
         */
        function getSurroundingText(element) {
          const surroundingText = [];
          
          try {
            // Get parent text
            if (element.parentElement) {
              const parentText = element.parentElement.textContent?.trim();
              if (parentText && parentText.length > 0 && parentText.length < 100) {
                surroundingText.push(parentText.substring(0, 100));
              }
            }

            // Get previous sibling text
            let prevSibling = element.previousElementSibling;
            if (prevSibling) {
              const prevText = prevSibling.textContent?.trim();
              if (prevText && prevText.length > 0 && prevText.length < 100) {
                surroundingText.push(prevText.substring(0, 100));
              }
            }

            // Get next sibling text
            let nextSibling = element.nextElementSibling;
            if (nextSibling) {
              const nextText = nextSibling.textContent?.trim();
              if (nextText && nextText.length > 0 && nextText.length < 100) {
                surroundingText.push(nextText.substring(0, 100));
              }
            }

            // Get aria-label or placeholder as context
            const ariaLabel = element.getAttribute('aria-label');
            if (ariaLabel) {
              surroundingText.push('aria:' + ariaLabel);
            }

            const placeholder = element.getAttribute('placeholder');
            if (placeholder) {
              surroundingText.push('placeholder:' + placeholder);
            }
          } catch (error) {
            console.warn('Failed to get surrounding text:', error);
          }

          return surroundingText.slice(0, 5); // Max 5 items
        }

        /**
         * Get element position (absolute and relative to viewport)
         * @param {HTMLElement} element - Target element
         * @param {number} clientX - Click X coordinate
         * @param {number} clientY - Click Y coordinate
         * @returns {Object} Position data
         */
        function getElementPosition(element, clientX, clientY) {
          const rect = element.getBoundingClientRect();
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;

          return {
            absolute: {
              x: Math.round(clientX),
              y: Math.round(clientY),
            },
            relative: {
              x: parseFloat(((clientX / viewportWidth) * 100).toFixed(2)),
              y: parseFloat(((clientY / viewportHeight) * 100).toFixed(2)),
            },
            elementCenter: {
              x: Math.round(rect.left + rect.width / 2),
              y: Math.round(rect.top + rect.height / 2),
            },
          };
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // BACKUP SELECTOR GENERATION (Fallback only)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        /**
         * Generate backup CSS selector (used as fallback)
         */
        function generateSelector(element) {
          if (!element || !element.tagName) return null;

          // Priority 1: ID selector
          if (element.id) {
            const idSelector = '#' + CSS.escape(element.id);
            if (document.querySelectorAll(idSelector).length === 1) {
              return idSelector;
            }
          }

          // Priority 2: Name attribute (for inputs)
          if (element.name) {
            const nameSelector = element.tagName.toLowerCase() + '[name="' + CSS.escape(element.name) + '"]';
            if (document.querySelectorAll(nameSelector).length === 1) {
              return nameSelector;
            }
          }

          // Priority 3: Placeholder (for inputs)
          if (element.placeholder) {
            const placeholderSelector = element.tagName.toLowerCase() + '[placeholder="' + CSS.escape(element.placeholder) + '"]';
            if (document.querySelectorAll(placeholderSelector).length === 1) {
              return placeholderSelector;
            }
          }

          // Priority 4: Data attributes
          if (element.dataset.testid) {
            const testIdSelector = element.tagName.toLowerCase() + '[data-testid="' + CSS.escape(element.dataset.testid) + '"]';
            if (document.querySelectorAll(testIdSelector).length === 1) {
              return testIdSelector;
            }
          }
          if (element.dataset.id) {
            const dataIdSelector = element.tagName.toLowerCase() + '[data-id="' + CSS.escape(element.dataset.id) + '"]';
            if (document.querySelectorAll(dataIdSelector).length === 1) {
              return dataIdSelector;
            }
          }

          // Priority 5: ARIA labels
          if (element.getAttribute('aria-label')) {
            const ariaSelector = element.tagName.toLowerCase() + '[aria-label="' + CSS.escape(element.getAttribute('aria-label')) + '"]';
            if (document.querySelectorAll(ariaSelector).length === 1) {
              return ariaSelector;
            }
          }

          // Priority 6: Class combination (if unique)
          if (element.className && typeof element.className === 'string') {
            const classes = element.className.trim().split(/\\s+/).filter(c => c);
            if (classes.length > 0) {
              const classSelector = element.tagName.toLowerCase() + '.' + classes.join('.');
              if (document.querySelectorAll(classSelector).length === 1) {
                return classSelector;
              }
            }
          }

          // Priority 7: Last resort - nth-child path
          let path = [];
          let current = element;
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
        }

        // Helper: Get element info
        function getElementInfo(element) {
          return {
            tag: element.tagName.toLowerCase(),
            id: element.id || null,
            name: element.name || null,
            type: element.type || null,
            placeholder: element.placeholder || null,
            text: element.textContent?.trim().substring(0, 100) || null,
            value: element.value || null,
            className: element.className || null,
            href: element.href || null,
          };
        }

        // Helper: Check if element is password field
        function isPasswordField(element) {
          return element.type === 'password' || 
                 (element.name && /password/i.test(element.name)) ||
                 (element.id && /password/i.test(element.id));
        }

        // Helper: Check if element is username field
        function isUsernameField(element) {
          return (element.name && /username|user|login/i.test(element.name)) ||
                 (element.id && /username|user|login/i.test(element.id)) ||
                 (element.placeholder && /username|user|login/i.test(element.placeholder));
        }

        // Helper: Check if element is email field
        function isEmailField(element) {
          return element.type === 'email' ||
                 (element.name && /email|e-mail/i.test(element.name)) ||
                 (element.id && /email|e-mail/i.test(element.id)) ||
                 (element.placeholder && /email|e-mail/i.test(element.placeholder));
        }

        // Record action with emoji indicators
        function recordAction(type, data) {
          const action = {
            type,
            timestamp: Date.now(),
            url: window.location.href,
            ...data,
          };
          window.__recordedActions.push(action);
          
          // Sync to sessionStorage after each action
          syncToStorage();
          
          // Update overlay with new action count
          updateOverlay();
          
          // Emoji indicators for each action type
          const emojiMap = {
            'click': '🎯',
            'type': '⌨️',
            'submit': '📤',
            'upload': '📁',
            'navigate': '🧭',
            'scroll': '📜'
          };
          
          const emoji = emojiMap[type] || '📹';
          const selector = data.backup_selector || data.selector || 'unknown';
          console.log(emoji + ' Recorded ' + type + ': ' + selector);
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // EVENT CAPTURE WITH VISUAL DATA
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        /**
         * Capture clicks with FULL VISUAL DATA
         */
        document.addEventListener('click', async function(e) {
          if (e.target === document.body || !e.target) return;
          
          const element = e.target;
          const rect = element.getBoundingClientRect();
          const position = getElementPosition(element, e.clientX, e.clientY);

          // Get selector for immediate logging
          const backup_selector = generateSelector(element);
          const elementInfo = getElementInfo(element);
          const selectorText = backup_selector || elementInfo.name || elementInfo.id || elementInfo.tag;
          
          // Immediate console log (before async screenshot)
          console.log('🎯 Recorded click: ' + selectorText);

          // Visual recording indicator
          element.style.outline = '3px solid #ff0000';
          setTimeout(() => { element.style.outline = ''; }, 500);

          // Create action timestamp for matching
          const actionTimestamp = Date.now();

          // Create visual data structure first (without screenshots)
          const visual = {
            screenshot: null, // Will be filled asynchronously
            contextScreenshot: null, // Will be filled asynchronously
            text: element.textContent?.trim().substring(0, 200) || '',
            position: position,
            boundingBox: {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            },
            surroundingText: getSurroundingText(element),
            timestamp: actionTimestamp,
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight,
            },
          };

          // Record action FIRST (before async screenshot)
          recordAction('click', {
            visual,
            backup_selector,
            element: elementInfo,
            execution_method: 'visual_first',
          });

          // Capture screenshots asynchronously and update the action
          if (window.html2canvas) {
            screenshotElement(element).then(screenshot => {
              // Find the action we just pushed and update it
              const lastAction = window.__recordedActions[window.__recordedActions.length - 1];
              if (lastAction && lastAction.visual && lastAction.visual.timestamp === actionTimestamp) {
                lastAction.visual.screenshot = screenshot;
                console.log('   ✅ Screenshot stored:', screenshot ? Math.round(screenshot.length / 1024) + 'KB' : 'null');
                // Sync to storage after screenshot is stored
                syncToStorage();
              }
            }).catch(error => {
              console.warn('   ⚠️ Screenshot capture failed:', error);
            });

            // Capture context screenshot asynchronously
            screenshotArea(element, 100).then(contextScreenshot => {
              const lastAction = window.__recordedActions[window.__recordedActions.length - 1];
              if (lastAction && lastAction.visual && lastAction.visual.timestamp === actionTimestamp) {
                lastAction.visual.contextScreenshot = contextScreenshot;
                syncToStorage();
              }
            }).catch(error => {
              // Silently ignore context screenshot failures
            });
          }

          // Show thumbnail preview in console
          if (screenshot) {
            const thumbnailSize = (screenshot.length / 1024).toFixed(1);
            const contextSize = contextScreenshot ? (contextScreenshot.length / 1024).toFixed(1) : '0';
            console.log(
              '%c📹 Recorded CLICK with visual data:',
              'color: #00ff00; font-weight: bold;',
              element,
              '\\n   Text: "' + visual.text.substring(0, 50) + '"',
              '\\n   Position (absolute):', visual.position.absolute,
              '\\n   Position (relative):', visual.position.relative,
              '\\n   Bounding Box:', visual.boundingBox,
              '\\n   Element Screenshot: ' + thumbnailSize + 'KB',
              contextScreenshot ? '\\n   Context Screenshot: ' + contextSize + 'KB' : '',
              '\\n   Surrounding Text:', visual.surroundingText.slice(0, 2)
            );
            // Create thumbnail preview (small image in console)
            console.log('%c ', 'font-size: 1px; padding: 50px 100px; background: url(' + screenshot + ') no-repeat; background-size: contain;');
          }
        }, true);

        /**
         * Capture typing/input with VISUAL DATA
         */
        let typingTimeout = null;
        const typingData = new Map();

        document.addEventListener('input', async function(e) {
          if (!e.target || (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA')) {
            return;
          }

          const element = e.target;
          const selector = generateSelector(element);
          const elementInfo = getElementInfo(element);

          // Clear previous timeout
          if (typingTimeout) {
            clearTimeout(typingTimeout);
          }

          // Store typing data
          if (!typingData.has(selector)) {
            typingData.set(selector, {
              selector,
              element: elementInfo,
              value: '',
              startTime: Date.now(),
              visualCaptured: false,
            });
          }

          const data = typingData.get(selector);
          data.value = element.value;
          data.endTime = Date.now();

          // Capture visual data once per field (not on every keystroke)
          if (!data.visualCaptured) {
            // Immediate console log when typing starts
            const selectorText = selector || elementInfo.name || elementInfo.placeholder || elementInfo.tag;
            console.log('⌨️ Recorded type: ' + selectorText);
            
            const rect = element.getBoundingClientRect();
            let screenshot = null;

            try {
              if (window.html2canvas) {
                screenshot = await screenshotElement(element);
              }
            } catch (error) {
              console.warn('Screenshot capture failed:', error);
            }

            data.visual = {
              screenshot: screenshot,
              text: element.textContent?.trim() || '',
              placeholder: element.placeholder || '',
              inputType: element.type || 'text',
              position: {
                absolute: {
                  x: Math.round(rect.left + rect.width / 2),
                  y: Math.round(rect.top + rect.height / 2),
                },
                relative: {
                  x: parseFloat((((rect.left + rect.width / 2) / window.innerWidth) * 100).toFixed(2)),
                  y: parseFloat((((rect.top + rect.height / 2) / window.innerHeight) * 100).toFixed(2)),
                },
              },
              boundingBox: {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
              },
              surroundingText: getSurroundingText(element),
              timestamp: Date.now(),
            };
            data.visualCaptured = true;

            // Visual indicator
            element.style.outline = '3px solid #00ff00';
            setTimeout(() => { element.style.outline = ''; }, 500);
          }

          // Debounce: record after 500ms of no typing
          typingTimeout = setTimeout(() => {
            // Auto-replace sensitive values with template variables
            let finalValue = data.value;
            
            if (isPasswordField(element)) {
              finalValue = '{{password}}';
            } else if (isUsernameField(element)) {
              finalValue = '{{username}}';
            } else if (isEmailField(element)) {
              finalValue = '{{email}}';
            } else if (element.tagName === 'TEXTAREA' || /caption|post|content|message/i.test(element.name)) {
              finalValue = '{{caption}}';
            }

            recordAction('type', {
              visual: data.visual,
              backup_selector: selector,
              element: elementInfo,
              value: finalValue,
              actual_value: data.value, // Keep for reference (will be stripped before saving)
              duration: data.endTime - data.startTime,
              execution_method: 'visual_first',
            });

            const thumbnailSize = data.visual.screenshot ? (data.visual.screenshot.length / 1024).toFixed(1) : '0';
            console.log(
              '%c📹 Recorded TYPE with visual data:',
              'color: #00ff00; font-weight: bold;',
              element,
              '\\n   Field:', elementInfo.placeholder || elementInfo.name,
              '\\n   Input Type:', data.visual.inputType,
              '\\n   Value template:', finalValue,
              '\\n   Position:', data.visual.position.absolute,
              '\\n   Screenshot: ' + thumbnailSize + 'KB'
            );
            // Create thumbnail preview
            if (data.visual.screenshot) {
              console.log('%c ', 'font-size: 1px; padding: 30px 80px; background: url(' + data.visual.screenshot + ') no-repeat; background-size: contain;');
            }

            typingData.delete(selector);
          }, 500);
        }, true);

        // Capture form submissions
        document.addEventListener('submit', function(e) {
          const form = e.target;
          const selector = generateSelector(form);
          
          recordAction('submit', {
            selector,
            formAction: form.action || null,
            formMethod: form.method || null,
          });
        }, true);

        // Capture file uploads
        document.addEventListener('change', function(e) {
          if (e.target.type === 'file' && e.target.files && e.target.files.length > 0) {
            const selector = generateSelector(e.target);
            const file = e.target.files[0];
            
            recordAction('upload', {
              selector,
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
            });
          }
        }, true);

        // Capture scroll events
        let scrollTimeout = null;
        let lastScrollY = window.scrollY;
        
        window.addEventListener('scroll', function() {
          if (scrollTimeout) {
            clearTimeout(scrollTimeout);
          }

          scrollTimeout = setTimeout(() => {
            const currentScrollY = window.scrollY;
            const direction = currentScrollY > lastScrollY ? 'down' : 'up';
            const amount = Math.abs(currentScrollY - lastScrollY);

            if (amount > 50) { // Only record significant scrolls
              recordAction('scroll', {
                direction,
                amount,
                scrollY: currentScrollY,
              });
            }

            lastScrollY = currentScrollY;
          }, 300);
        }, true);

        // Capture navigation (pushState/replaceState)
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function(...args) {
          originalPushState.apply(history, args);
          recordAction('navigate', {
            url: window.location.href,
            method: 'pushState',
          });
        };

        history.replaceState = function(...args) {
          originalReplaceState.apply(history, args);
          recordAction('navigate', {
            url: window.location.href,
            method: 'replaceState',
          });
        };

        // Capture popstate (back/forward)
        window.addEventListener('popstate', function() {
          recordAction('navigate', {
            url: window.location.href,
            method: 'popstate',
          });
        });

        // Capture full page navigations (not just SPA)
        let lastUrl = window.location.href;
        window.addEventListener('beforeunload', function() {
          // Page is about to unload, record navigation
          recordAction('navigate', {
            url: window.location.href,
            method: 'page_unload',
          });
        });

        // Monitor for URL changes (for SPAs and full page loads)
        setInterval(() => {
          if (window.location.href !== lastUrl) {
            const newUrl = window.location.href;
            // Only record if it's a significant change (not just hash change)
            if (newUrl.split('#')[0] !== lastUrl.split('#')[0]) {
              recordAction('navigate', {
                url: newUrl,
                method: 'url_change',
              });
            }
            lastUrl = newUrl;
          }
        }, 500);

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // EDGE CASE HANDLING
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        // Monitor for iframes being added dynamically
        const iframeObserver = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
              if (node.tagName === 'IFRAME') {
                // Skip html2canvas temporary iframes (they cause errors)
                const iframeSrc = node.src || '';
                if (iframeSrc.includes('html2canvas') || iframeSrc === '' || iframeSrc === 'about:blank') {
                  // Skip html2canvas or blank iframes
                  return;
                }
                
                try {
                  // Try to inject recorder into iframe (same-origin only)
                  const iframeWindow = node.contentWindow;
                  if (iframeWindow && iframeWindow.document) {
                    console.log('📝 Injecting recorder into iframe:', node.src);
                    // Note: Full script injection into iframes is complex and may fail
                    // For now, we'll skip iframe injection to avoid errors
                    // If needed, can be implemented with proper script serialization
                  }
                } catch (error) {
                  // Cross-origin iframe, cannot inject
                  // Silently ignore - this is expected for cross-origin iframes
                }
              }
            });
          });
        });

        iframeObserver.observe(document.body, {
          childList: true,
          subtree: true,
        });

        // Handle Shadow DOM (experimental)
        // Note: html2canvas may not work well with shadow DOM
        // TODO: Add shadow DOM traversal for visual recording

          console.log('✅ Visual action recorder injected and active');
          console.log('📹 Recording clicks, typing, navigation with screenshots');
          console.log('💡 Red outline = click recorded, Green outline = input recorded');
          console.log('⚠️ Do not close DevTools during recording');
        } catch (error) {
          console.error('❌ Recorder failed to initialize:', error);
          alert('Recorder failed to initialize. Please refresh the page.');
        }
      })();
    `