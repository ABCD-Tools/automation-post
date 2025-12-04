import puppeteer from 'puppeteer-core';
import { findChrome } from '../../modules-agents/utils/browser.mjs';
import { getPlatformConfig, usesMobileViewport } from '../config/platform.mjs';

/**
 * Launch browser with platform-specific configuration
 * @param {string} platform - Platform name
 * @returns {Promise<Object>} Browser and page instances
 */
export async function launchBrowser(platform) {
  const executablePath = findChrome();
  console.log('🔍 Found Chrome at:', executablePath);

  const config = getPlatformConfig(platform);

  // Launch browser in visible mode
  const browser = await puppeteer.launch({
    executablePath,
    headless: false,
    protocolTimeout: config.protocolTimeout,
    args: [
      '--window-size=1920,1080',
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-dev-shm-usage',
    ],
  });

  const page = await browser.newPage();

  // Set viewport based on platform
  if (usesMobileViewport(platform)) {
    console.log('📱 Using mobile viewport for', platform);
    await page.emulate({
      name: 'iPhone 12',
      viewport: {
        width: 390,
        height: 844,
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    });
  } else if (platform === 'twitter') {
    console.log('🖥️  Using desktop viewport for', platform);
    await page.setViewport({ width: 1280, height: 720 });
  } else {
    // Default to desktop viewport
    await page.setViewport({ width: 1280, height: 720 });
  }

  return { browser, page, config };
}

/**
 * Navigate to URL and wait for page to be ready
 * @param {Object} page - Puppeteer page instance
 * @param {string} url - URL to navigate to
 * @returns {Promise<void>}
 */
export async function navigateToUrl(page, url) {
  console.log('🌐 Navigating to:', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

  // Wait for page to be interactive
  await page.waitForFunction(() => {
    return document.readyState === 'complete' && document.body !== null;
  }, { timeout: 10000 }).catch(() => {
    console.warn('⚠️ Page interactive check timed out, continuing anyway...');
  });
}

