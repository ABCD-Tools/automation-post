import { generateSelector } from './selector-generator.mjs';

/**
 * Server-side: Capture element screenshot using Puppeteer
 * @param {ElementHandle} elementHandle - Puppeteer element handle
 * @returns {Promise<string|null>} Base64 data URL or null
 */
export async function screenshotElement(elementHandle) {
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
 * @param {Object} page - Puppeteer page instance
 * @param {ElementHandle} elementHandle - Puppeteer element handle
 * @param {number} padding - Padding in pixels (default 100)
 * @returns {Promise<string|null>} Base64 data URL or null
 */
export async function screenshotArea(page, elementHandle, padding = 100) {
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
    const screenshot = await page.screenshot({
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
export async function getSurroundingText(elementHandle) {
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
 * Server-side: Capture click action with comprehensive visual data
 * @param {Object} page - Puppeteer page instance
 * @param {ElementHandle} elementHandle - Puppeteer element handle
 * @param {number} clientX - Click X coordinate
 * @param {number} clientY - Click Y coordinate
 * @returns {Promise<Object>} Action object with visual data
 */
export async function captureClick(page, elementHandle, clientX, clientY) {
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
    const screenshot = await screenshotElement(elementHandle);

    // Capture surrounding area screenshot (100px padding)
    const contextScreenshot = await screenshotArea(page, elementHandle, 100);

    // Get surrounding text
    const surroundingText = await getSurroundingText(elementHandle);

    // Generate backup selector
    const backupSelector = await generateSelector(elementHandle, (fn) => elementHandle.evaluate(fn));

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
 * Server-side: Capture type/input action with visual data
 * @param {Object} page - Puppeteer page instance
 * @param {ElementHandle} elementHandle - Puppeteer element handle
 * @param {string} value - Input value (will be templated if sensitive)
 * @returns {Promise<Object>} Action object with visual data and templated value
 */
export async function captureType(page, elementHandle, value) {
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
    const screenshot = await screenshotElement(elementHandle);

    // Get surrounding text
    const surroundingText = await getSurroundingText(elementHandle);

    // Generate backup selector
    const backupSelector = await generateSelector(elementHandle, (fn) => elementHandle.evaluate(fn));

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

