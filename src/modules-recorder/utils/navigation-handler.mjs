
/**
 * Navigation handler for managing page navigations and re-injections
 */
export class NavigationHandler {
  constructor(recorder) {
    this.recorder = recorder;
    this.lastUrl = null;
    this.navigationCount = 0;
    this.currentPlatform = null;
  }

  /**
   * Initialize navigation handler
   * @param {Object} page - Puppeteer page instance
   * @param {string} url - Initial URL
   * @param {string} platform - Platform name
   */
  initialize(page, url, platform) {
    this.lastUrl = url;
    this.currentPlatform = platform;

    // Smart navigation detection with SPA handling
    page.on('framenavigated', async (frame) => {
      if (frame !== page.mainFrame()) return;
      
      try {
        const currentUrl = page.url();
        
        // Skip if URL hasn't changed (React re-render, not navigation)
        if (currentUrl === this.lastUrl) {
          console.log('   ⏭️ Skipping re-render (same URL)');
          return;
        }
        
        this.navigationCount++;
        console.log(`🧭 Navigation ${this.navigationCount} detected:`);
        console.log('   - From:', this.lastUrl);
        console.log('   - To:', currentUrl);

        // Record navigation action in the page so we can later attach
        // full-page screenshots during the Puppeteer enrichment pass.
        try {
          await page.evaluate((url) => {
            if (window.__recordedActions) {
              window.__recordedActions.push({
                type: 'navigate',
                timestamp: Date.now(),
                url,
                method: 'navigation_handler',
              });
              console.log('🧭 Recorded navigation action for URL:', url);
            }
          }, currentUrl);
        } catch (navRecordError) {
          console.warn('⚠️ Failed to record navigation action:', navRecordError?.message || navRecordError);
        }
        
        // FIX: Get backup BEFORE navigation completes (race condition fix)
        // Try to get actions from current page before it navigates away
        let previousActions = [];
        try {
          previousActions = await this.recorder.getRecordedActions(1);
          if (previousActions && previousActions.length > 0) {
            // Store in backup immediately
            this.recorder.backupActions = previousActions;
            console.log(`   💾 Backed up ${previousActions.length} actions before navigation`);
          }
        } catch (error) {
          // If we can't get actions, use existing backup
          console.log('   ⚠️ Could not get actions before navigation, using existing backup');
          previousActions = this.recorder.backupActions || [];
        }
        
        // Check if we should re-inject
        if (this.shouldReinject(currentUrl)) {
          console.log('   - Will re-inject: true');
          
          // Wait for page stability before re-injection
          await this.recorder.waitForPageStability();
          
          // Instagram-specific: wait for login completion
          if (this.currentPlatform === 'instagram' && 
              this.lastUrl?.includes('/accounts/login/') && 
              !currentUrl.includes('/accounts/login/')) {
            await this.recorder.waitForLoginCompletion();
          }

          // Re-inject with graceful degradation, passing Node-side backup so we
          // don't rely on window.__recordedActions on the new page (CSP-safe)
          await this.recorder.reinjectRecorderScript(previousActions);
        } else {
          console.log('   ⏭️ Skipping re-injection (same domain SPA route)');
        }
        
        this.lastUrl = currentUrl;
      } catch (error) {
        console.warn('⚠️ Navigation handler error:', error.message);
      }
    });
  }

  /**
   * Determine if recorder should be re-injected after navigation
   * @param {string} url - Current URL
   * @returns {boolean} True if should re-inject
   */
  shouldReinject(url) {
    if (!this.lastUrl) return true;
    
    try {
      const previousDomain = new URL(this.lastUrl).hostname;
      const currentDomain = new URL(url).hostname;
      
      // Re-inject on different domain
      if (previousDomain !== currentDomain) return true;
      
      // Instagram-specific: re-inject after login
      if (this.lastUrl.includes('/accounts/login/') && !url.includes('/accounts/login/')) {
        return true; // Navigating FROM login, definitely re-inject
      }
      
      // Skip re-injection for same-domain SPA routes (unless login transition)
      return false;
    } catch (error) {
      // If URL parsing fails, default to re-injecting
      return true;
    }
  }
}

