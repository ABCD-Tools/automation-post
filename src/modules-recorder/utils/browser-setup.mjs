import puppeteer from 'puppeteer-core';
import { findChrome } from '../../modules-agents/utils/browser.mjs';

/**
 * Launch browser with platform-specific configuration
 * @param {Object} config - Platform configuration
 * @returns {Promise<Object>} Browser and page instances
 */
export async function launchBrowser(config) {
  const executablePath = findChrome();
  console.log('🔍 Found Chrome at:', executablePath);

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

  // Always use desktop viewport for recording (modal input appears properly on desktop)
  await page.setViewport({ width: 1280, height: 720 });

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

