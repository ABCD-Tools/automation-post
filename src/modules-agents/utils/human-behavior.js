// Random delays, typing simulation

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate random number from normal distribution
 */
function randomNormal() {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Random delay with human-like distribution (normal distribution)
 * @param {number} min - Minimum delay in ms
 * @param {number} max - Maximum delay in ms
 */
export async function randomDelay(min = 1000, max = 3000) {
  // Use normal distribution (bell curve) instead of uniform
  const mean = (min + max) / 2;
  const stdDev = (max - min) / 6;
  const delay = Math.max(min, Math.min(max, 
    mean + (randomNormal() * stdDev)
  ));
  await sleep(Math.round(delay));
}

/**
 * Simulate human typing with variable speed
 * @param {import('puppeteer-core').Page} page - Puppeteer page
 * @param {string} selector - Element selector
 * @param {string} text - Text to type
 */
export async function humanType(page, selector, text) {
  const element = await page.$(selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }
  
  await element.click();
  await randomDelay(100, 300);
  
  for (const char of text) {
    await element.type(char, {
      delay: 50 + Math.random() * 100, // Variable typing speed (50-150ms)
    });
    
    // Occasional longer pauses (thinking)
    if (Math.random() < 0.1) {
      await randomDelay(200, 500);
    }
    
    // Occasional typos and corrections (5% chance)
    if (Math.random() < 0.05 && text.length > 5) {
      await element.type('\b'); // Backspace
      await randomDelay(100, 200);
      await element.type(char); // Type correct character
    }
  }
}

/**
 * Calculate Bezier curve point
 */
function bezierCurve(p0, p1, t) {
  return {
    x: p0.x + (p1.x - p0.x) * t,
    y: p0.y + (p1.y - p0.y) * t,
  };
}

/**
 * Simulate human mouse movement using Bezier curve
 * @param {import('puppeteer-core').Page} page - Puppeteer page
 * @param {Object} from - Starting position {x, y}
 * @param {Object} to - Target position {x, y}
 */
export async function humanMouseMove(page, from, to) {
  // Use Bezier curve for natural movement
  const steps = 20 + Math.floor(Math.random() * 10);
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const point = bezierCurve(from, to, t);
    await page.mouse.move(point.x, point.y);
    await sleep(10 + Math.random() * 10);
  }
}

/**
 * Random scroll behavior
 * @param {import('puppeteer-core').Page} page - Puppeteer page
 * @param {string} direction - 'up' or 'down'
 * @param {number} amount - Optional scroll amount
 */
export async function humanScroll(page, direction = 'down', amount = null) {
  const scrollAmount = amount || (300 + Math.random() * 400);
  const steps = 5 + Math.floor(Math.random() * 5);
  
  for (let i = 0; i < steps; i++) {
    await page.evaluate((amount, dir) => {
      window.scrollBy(0, dir === 'down' ? amount : -amount);
    }, scrollAmount / steps, direction);
    
    await randomDelay(50, 150);
  }
}

/**
 * Random viewport resize (simulate user resizing window)
 */
export async function randomViewportResize(page) {
  const widths = [1920, 1366, 1536, 1440, 1280];
  const heights = [1080, 768, 864, 900, 720];
  
  const width = widths[Math.floor(Math.random() * widths.length)];
  const height = heights[Math.floor(Math.random() * heights.length)];
  
  await page.setViewport({ width, height });
  await randomDelay(500, 1000);
}

/**
 * Simulate reading behavior (random scrolls and pauses)
 */
export async function simulateReading(page, duration = 5000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < duration) {
    // Random scroll
    await humanScroll(page, Math.random() > 0.5 ? 'down' : 'up');
    
    // Random pause (reading)
    await randomDelay(1000, 3000);
  }
}

/**
 * Random mouse movement (idle behavior)
 */
export async function randomMouseMovement(page) {
  const viewport = page.viewport();
  const x = Math.random() * viewport.width;
  const y = Math.random() * viewport.height;
  
  await page.mouse.move(x, y);
  await randomDelay(100, 500);
}
