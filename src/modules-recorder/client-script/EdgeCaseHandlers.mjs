export const EdgeCaseHandlers = `
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
              // Try to inspect iframe (same-origin only)
              const iframeWindow = node.contentWindow;
              if (iframeWindow && iframeWindow.document) {
                console.log('📝 Detected iframe (recorder not injected automatically):', node.src);
                // Note: Full script injection into iframes is complex and may fail
                // For now, we log and skip injection to avoid errors.
              }
            } catch (error) {
              // Cross-origin iframe, cannot access
              // Silently ignore - this is expected for cross-origin iframes
            }
          }
        });
      });
    });

    // Monitor for modals and dynamically added elements
    // Instagram and other SPAs often add modals to document.body or a portal container
    const modalObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          // Skip text nodes
          if (node.nodeType !== 1) return;
          
          // Check if this looks like a modal/dialog
          const isModal = 
            node.tagName === 'DIALOG' ||
            (node.getAttribute && (
              node.getAttribute('role') === 'dialog' ||
              node.getAttribute('aria-modal') === 'true' ||
              /modal|dialog|overlay|popup/i.test(node.className || '') ||
              /modal|dialog|overlay|popup/i.test(node.id || '')
            ));
          
          if (isModal) {
            console.log('📦 Modal detected, ensuring event capture is active');
            // Event listeners on document should already capture events from modals
            // But we log to confirm detection
          }
          
          // Also check for file input elements in modals (Instagram upload modal)
          if (node.querySelectorAll) {
            const fileInputs = node.querySelectorAll('input[type="file"]');
            if (fileInputs.length > 0) {
              console.log('📁 File input(s) detected in dynamically added element:', fileInputs.length);
              // File inputs should be captured by the change event listener on document
            }
          }
        });
      });
    });

    // Observe document body and document root for modals
    // Modals are often added to body or a root container
    const observeTargets = [document.body, document.documentElement].filter(Boolean);
    observeTargets.forEach(target => {
      if (target) {
        iframeObserver.observe(target, {
          childList: true,
          subtree: true,
        });
        
        modalObserver.observe(target, {
          childList: true,
          subtree: true,
          attributes: false,
        });
      }
    });

    // Also observe any existing portal/overlay containers
    // Instagram and other apps often use these
    const portalSelectors = [
      '#react-root',
      '[id*="portal"]',
      '[id*="overlay"]',
      '[id*="modal"]',
      '[class*="portal"]',
      '[class*="overlay"]',
    ];
    
    setTimeout(() => {
      portalSelectors.forEach(selector => {
        try {
          const containers = document.querySelectorAll(selector);
          containers.forEach(container => {
            if (container && !container.dataset.recorderObserved) {
              container.dataset.recorderObserved = 'true';
              modalObserver.observe(container, {
                childList: true,
                subtree: true,
              });
              console.log('📦 Observing portal/overlay container:', selector);
            }
          });
        } catch (e) {
          // Ignore selector errors
        }
      });
    }, 1000); // Wait a bit for containers to be added

    // Handle Shadow DOM (experimental)
    // Note: html2canvas may not work well with shadow DOM
    // TODO: Add shadow DOM traversal for visual recording

    console.log('✅ Visual action recorder injected and active');
    console.log('📹 Recording clicks, typing, navigation with screenshots');
    console.log('💡 Red outline = click recorded, Green outline = input recorded');
    console.log('📦 Monitoring for dynamically added modals and elements');
    console.log('⚠️ Do not close DevTools during recording');
  } catch (error) {
    console.error('❌ Recorder failed to initialize:', error);
    alert('Recorder failed to initialize. Please refresh the page.');
  }
`;

