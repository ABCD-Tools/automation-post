// Anti-detection utilities

/**
 * Apply stealth techniques to Puppeteer page
 * @param {import('puppeteer-core').Page} page - Puppeteer page instance
 */
export async function applyStealth(page) {
  // 1. Override navigator properties
  await page.evaluateOnNewDocument(() => {
    // Override webdriver flag
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
    
    // Override plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
    
    // Override languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });
    
    // Override permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
    
    // Override chrome runtime
    window.chrome = {
      runtime: {},
    };
    
    // Override platform
    Object.defineProperty(navigator, 'platform', {
      get: () => 'Win32',
    });
    
    // Override hardware concurrency (randomize between 4-16)
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => Math.floor(Math.random() * 12) + 4,
    });
    
    // Override device memory
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => 8,
    });
  });
  
  // 2. Set realistic viewport
  await page.setViewport({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
  });
  
  // 3. Set realistic user agent
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  
  // 4. Add extra headers
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  });
  
  // 5. Override permissions for specific domains
  const context = page.browserContext();
  try {
    await context.overridePermissions('https://www.instagram.com', [
      'geolocation',
      'notifications',
    ]);
  } catch (error) {
    // Ignore if domain not yet navigated
  }
  
  try {
    await context.overridePermissions('https://www.facebook.com', [
      'geolocation',
      'notifications',
    ]);
  } catch (error) {
    // Ignore if domain not yet navigated
  }
  
  try {
    await context.overridePermissions('https://twitter.com', [
      'geolocation',
      'notifications',
    ]);
  } catch (error) {
    // Ignore if domain not yet navigated
  }
}

/**
 * Randomize canvas fingerprint
 */
export async function randomizeCanvasFingerprint(page) {
  await page.evaluateOnNewDocument(() => {
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(type) {
      if (type === 'image/png') {
        const context = this.getContext('2d');
        const imageData = context.getImageData(0, 0, this.width, this.height);
        // Add slight noise to prevent fingerprinting
        for (let i = 0; i < imageData.data.length; i += 4) {
          if (Math.random() < 0.01) {
            imageData.data[i] = Math.min(255, imageData.data[i] + Math.floor(Math.random() * 3) - 1);
          }
        }
        context.putImageData(imageData, 0, 0);
      }
      return originalToDataURL.apply(this, arguments);
    };
  });
}

/**
 * Randomize WebGL fingerprint
 */
export async function randomizeWebGLFingerprint(page) {
  await page.evaluateOnNewDocument(() => {
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
        return 'Intel Inc.';
      }
      if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
        return 'Intel Iris OpenGL Engine';
      }
      return getParameter.apply(this, arguments);
    };
  });
}

/**
 * Apply all stealth techniques
 */
export async function applyAllStealth(page) {
  await applyStealth(page);
  await randomizeCanvasFingerprint(page);
  await randomizeWebGLFingerprint(page);
}
