export const UIOverlay = `
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // RECORDING STATUS OVERLAY
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    function getViewportInfo() {
      return {
        width: window.innerWidth,
        height: window.innerHeight,
        outerWidth: window.outerWidth,
        outerHeight: window.outerHeight
      };
    }

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

    const overlay = createOverlay();

    function updateOverlay() {
      const count = window.__recordedActions ? window.__recordedActions.length : 0;
      const countElement = document.getElementById('__recorder_count');
      if (countElement) {
        countElement.textContent = count + ' action' + (count !== 1 ? 's' : '');
      }
    }
`;

