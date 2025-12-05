
/**
 * Wait for page stability (network idle + no DOM mutations)
 * @param {Object} page - Puppeteer page instance
 * @param {Object} platformConfig - Platform configuration
 * @param {number} timeout - Optional timeout override
 * @returns {Promise<boolean>} True if stable, false if timeout
 */
export async function waitForPageStability(page, platformConfig, timeout = null) {
  const waitTime = timeout || (platformConfig?.navigationStabilityWait || 10000);
  console.log('   ⏳ Waiting for page stability...');
  
  try {
    // Wait for network to be idle
    const startTime = Date.now();
    let lastRequestCount = 0;
    let idleCount = 0;
    
    while (Date.now() - startTime < waitTime) {
      const requestCount = await page.evaluate(() => {
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
    await page.evaluate(() => {
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
 * Wait for Instagram login completion
 * @param {Object} page - Puppeteer page instance
 * @param {Object} platformConfig - Platform configuration
 * @returns {Promise<boolean>} True if login detected, false if timeout
 */
export async function waitForLoginCompletion(page, platformConfig) {
  console.log('🔐 Detecting Instagram login...');
  
  try {
    await page.waitForFunction(
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
    await waitForPageStability(page, platformConfig, 15000); // Longer wait for feed
    return true;
    
  } catch (error) {
    console.log('⚠️ Login detection timeout');
    return false;
  }
}

