export const EventHandlers = `
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // EVENT CAPTURE WITH VISUAL DATA
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // Clicks with visual data
    // Using capture phase (true) to catch events from dynamically added modals
    document.addEventListener('click', async function(e) {
      if (e.target === document.body || !e.target) return;
      
      const element = e.target;
      
      // Debug: Log if clicking in a modal
      const isInModal = element.closest && (
        element.closest('[role="dialog"]') ||
        element.closest('[aria-modal="true"]') ||
        element.closest('[class*="modal"]') ||
        element.closest('[class*="dialog"]') ||
        element.closest('[id*="modal"]') ||
        element.closest('[id*="dialog"]')
      );
      
      if (isInModal) {
        console.log('📦 Click detected in modal/dialog');
      }
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
            if (typeof syncToStorage === 'function') {
              syncToStorage();
            }
          }
        }).catch(error => {
          console.warn('   ⚠️ Screenshot capture failed:', error);
        });

        // Capture context screenshot asynchronously
        screenshotArea(element, 100).then(contextScreenshot => {
          const lastAction = window.__recordedActions[window.__recordedActions.length - 1];
          if (lastAction && lastAction.visual && lastAction.visual.timestamp === actionTimestamp) {
            lastAction.visual.contextScreenshot = contextScreenshot;
            if (typeof syncToStorage === 'function') {
              syncToStorage();
            }
          }
        }).catch(error => {
          // Silently ignore context screenshot failures
        });
      }

      // NOTE: The original script tried to log screenshot thumbnails synchronously here,
      // but that relied on a screenshot variable that wasn't in scope. We keep behavior
      // aligned by not adding additional synchronous logging.
    }, true);

    // Typing/input with visual data
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
          actual_value: data.value, // Kept in memory; will be stripped before saving remotely
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

    // Capture file uploads (including from modals)
    // Using capture phase to catch events from dynamically added file inputs
    document.addEventListener('change', function(e) {
      if (e.target.type === 'file' && e.target.files && e.target.files.length > 0) {
        const selector = generateSelector(e.target);
        const file = e.target.files[0];
        
        // Check if file input is in a modal
        const isInModal = e.target.closest && (
          e.target.closest('[role="dialog"]') ||
          e.target.closest('[aria-modal="true"]') ||
          e.target.closest('[class*="modal"]') ||
          e.target.closest('[id*="modal"]')
        );
        
        if (isInModal) {
          console.log('📁 File upload detected in modal:', file.name);
        }
        
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
`;

