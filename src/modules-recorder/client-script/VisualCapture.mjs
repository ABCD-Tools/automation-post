export const VisualCapture = `
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // VISUAL DATA CAPTURE HELPERS (CLIENT-SIDE METADATA ONLY)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //
    // IMPORTANT:
    // - We no longer rely on html2canvas in the page context because it is
    //   often blocked by CSP on sites like Instagram.
    // - Actual screenshots are captured on the Puppeteer/Node side using
    //   the browser's native screenshot capability.
    // - These helpers now focus on providing consistent geometry and
    //   context metadata that the server-side code can use.

    async function screenshotElement(element) {
      // Client-side no-op; real screenshot is taken by Puppeteer.
      if (!element || !element.getBoundingClientRect) {
        console.warn('   ❌ Cannot capture client metadata for screenshotElement');
        return null;
      }

      const rect = element.getBoundingClientRect();
      console.log(
        '📸 (Puppeteer) Screenshot requested for element:',
        element.tagName,
        element.className || '(no class)',
        'size:',
        rect.width + 'x' + rect.height
      );

      // Return null here; Puppeteer will populate visual.screenshot later.
      return null;
    }

    async function screenshotArea(element, padding = 100) {
      // Client-side no-op; real screenshot area capture is handled by Puppeteer.
      if (!element || !element.getBoundingClientRect) {
        console.warn('   ❌ Cannot capture client metadata for screenshotArea');
        return null;
      }

      const rect = element.getBoundingClientRect();
      const areaWidth = Math.min(window.innerWidth, rect.width + padding * 2);
      const areaHeight = Math.min(window.innerHeight, rect.height + padding * 2);

      console.log(
        '📸 (Puppeteer) Context screenshot requested:',
        'target size:',
        Math.round(areaWidth) + 'x' + Math.round(areaHeight)
      );

      // Return null; Puppeteer-side utilities will capture the actual bitmap.
      return null;
    }

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
`;

