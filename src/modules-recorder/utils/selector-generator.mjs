/**
 * Generate backup CSS selector (used as fallback)
 * Works both client-side and server-side
 * 
 * @param {HTMLElement|ElementHandle} element - Target element
 * @param {Function} evaluateFn - Optional evaluation function for server-side (Puppeteer)
 * @returns {Promise<string|null>|string|null} CSS selector or null
 */
export async function generateSelector(element, evaluateFn = null) {
  // Server-side (Puppeteer)
  if (evaluateFn) {
    // IMPORTANT: We cannot rely on generateSelectorClient being defined in the
    // page context, so we inline the selector logic inside the evaluate call.
    return await evaluateFn((el) => {
      function generateSelectorInline(element) {
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
          const nameSelector =
            element.tagName.toLowerCase() +
            '[name="' +
            CSS.escape(element.name) +
            '"]';
          if (document.querySelectorAll(nameSelector).length === 1) {
            return nameSelector;
          }
        }

        // Priority 3: Placeholder (for inputs)
        if (element.placeholder) {
          const placeholderSelector =
            element.tagName.toLowerCase() +
            '[placeholder="' +
            CSS.escape(element.placeholder) +
            '"]';
          if (document.querySelectorAll(placeholderSelector).length === 1) {
            return placeholderSelector;
          }
        }

        // Priority 4: Data attributes
        if (element.dataset.testid) {
          const testIdSelector =
            element.tagName.toLowerCase() +
            '[data-testid="' +
            CSS.escape(element.dataset.testid) +
            '"]';
          if (document.querySelectorAll(testIdSelector).length === 1) {
            return testIdSelector;
          }
        }
        if (element.dataset.id) {
          const dataIdSelector =
            element.tagName.toLowerCase() +
            '[data-id="' +
            CSS.escape(element.dataset.id) +
            '"]';
          if (document.querySelectorAll(dataIdSelector).length === 1) {
            return dataIdSelector;
          }
        }

        // Priority 5: ARIA labels
        const aria = element.getAttribute('aria-label');
        if (aria) {
          const ariaSelector =
            element.tagName.toLowerCase() +
            '[aria-label="' +
            CSS.escape(aria) +
            '"]';
          if (document.querySelectorAll(ariaSelector).length === 1) {
            return ariaSelector;
          }
        }

        // Priority 6: Class combination (if unique)
        if (element.className && typeof element.className === 'string') {
          const classes = element.className.trim().split(/\s+/).filter(Boolean);
          if (classes.length > 0) {
            const classSelector =
              element.tagName.toLowerCase() + '.' + classes.join('.');
            if (document.querySelectorAll(classSelector).length === 1) {
              return classSelector;
            }
          }
        }

        // Priority 7: Last resort - nth-child path
        const path = [];
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

      return generateSelectorInline(el);
    });
  }
  
  // Client-side
  return generateSelectorClient(element);
}

/**
 * Client-side selector generation
 * @param {HTMLElement} element - Target element
 * @returns {string|null} CSS selector or null
 */
function generateSelectorClient(element) {
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
    const classes = element.className.trim().split(/\s+/).filter(c => c);
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

