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

    if (document.body) {
      iframeObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

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
`;

