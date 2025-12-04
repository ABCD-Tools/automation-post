/**
 * Visual Executor Test Suite
 * 
 * Run with: node src/modules-client/visual-executor.test.js
 */

import { VisualActionExecutor } from './visual-executor.js';
import puppeteer from 'puppeteer-core';
import { findChrome } from '../modules-agents/utils/browser.js';

// Test configuration
const TEST_URL = 'https://example.com';
const HEADLESS = false; // Set to true for CI/CD

/**
 * Test helper: Create mock action
 */
function createMockAction(type, params) {
  return {
    name: `Test ${type} action`,
    type,
    params: {
      ...params,
      execution_method: 'visual_first',
    },
  };
}

/**
 * Test 1: Constructor
 */
async function testConstructor() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 1: Constructor');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const executablePath = findChrome();
    const browser = await puppeteer.launch({
      executablePath,
      headless: HEADLESS,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    const page = await browser.newPage();
    const executor = new VisualActionExecutor(page);

    console.assert(executor.page === page, 'Page should be set');
    console.assert(executor.debugMode === false, 'Debug mode should be false by default');
    console.assert(executor.executionStats.failures === 0, 'Failures should be 0');

    await browser.close();
    console.log('✅ Constructor test passed');
    return true;
  } catch (error) {
    console.error('❌ Constructor test failed:', error);
    return false;
  }
}

/**
 * Test 2: Selector-based execution
 */
async function testSelectorExecution() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 2: Selector-based execution');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let browser;
  try {
    const executablePath = findChrome();
    browser = await puppeteer.launch({
      executablePath,
      headless: HEADLESS,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    const page = await browser.newPage();
    const executor = new VisualActionExecutor(page);

    // Navigate to test page
    await page.goto('https://example.com');

    // Create test action - click the "More information" link
    const action = createMockAction('click', {
      visual: {
        text: 'More information',
        position: {
          absolute: { x: 500, y: 500 },
          relative: { x: 50, y: 50 },
        },
        boundingBox: { x: 400, y: 480, width: 200, height: 40 },
      },
      backup_selector: 'a',
    });

    const result = await executor.executeAction(action);

    console.assert(result.success === true, 'Action should succeed');
    console.log(`Method used: ${result.method}`);
    console.log('Stats:', executor.getStats());

    await browser.close();
    console.log('✅ Selector execution test passed');
    return true;
  } catch (error) {
    console.error('❌ Selector execution test failed:', error);
    if (browser) await browser.close();
    return false;
  }
}

/**
 * Test 3: Text-based search
 */
async function testTextBasedSearch() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 3: Text-based search');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let browser;
  try {
    const executablePath = findChrome();
    browser = await puppeteer.launch({
      executablePath,
      headless: HEADLESS,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    const page = await browser.newPage();
    const executor = new VisualActionExecutor(page);

    await page.goto('https://example.com');

    // Find elements by text
    const candidates = await executor.findByText('Example');

    console.assert(candidates.length > 0, 'Should find elements with "Example" text');
    console.log(`Found ${candidates.length} candidates`);
    
    // Verify candidate structure
    const firstCandidate = candidates[0];
    console.assert(firstCandidate.text, 'Candidate should have text');
    console.assert(firstCandidate.position, 'Candidate should have position');
    console.assert(firstCandidate.boundingBox, 'Candidate should have boundingBox');

    await browser.close();
    console.log('✅ Text search test passed');
    return true;
  } catch (error) {
    console.error('❌ Text search test failed:', error);
    if (browser) await browser.close();
    return false;
  }
}

/**
 * Test 4: Position filtering
 */
async function testPositionFiltering() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 4: Position filtering');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const executablePath = findChrome();
    const browser = await puppeteer.launch({
      executablePath,
      headless: HEADLESS,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    const page = await browser.newPage();
    const executor = new VisualActionExecutor(page);

    // Mock candidates
    const candidates = [
      {
        text: 'Button A',
        position: { relative: { x: 50, y: 50 } },
      },
      {
        text: 'Button B',
        position: { relative: { x: 60, y: 55 } },
      },
      {
        text: 'Button C',
        position: { relative: { x: 80, y: 80 } },
      },
    ];

    // Filter with tolerance 15%
    const filtered = executor.filterByPosition(
      candidates,
      { x: 50, y: 50 },
      15
    );

    console.assert(filtered.length === 2, 'Should filter to 2 candidates (A and B)');
    console.assert(filtered[0].text === 'Button A', 'First should be Button A');
    console.assert(filtered[1].text === 'Button B', 'Second should be Button B');

    await browser.close();
    console.log('✅ Position filtering test passed');
    return true;
  } catch (error) {
    console.error('❌ Position filtering test failed:', error);
    return false;
  }
}

/**
 * Test 5: Click at position
 */
async function testClickAtPosition() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 5: Click at position');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let browser;
  try {
    const executablePath = findChrome();
    browser = await puppeteer.launch({
      executablePath,
      headless: HEADLESS,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    const page = await browser.newPage();
    const executor = new VisualActionExecutor(page);

    await page.goto('https://example.com');

    // Click at center of viewport
    const result = await executor.clickAtPosition(500, 300);

    console.assert(result.success === true, 'Click should succeed');
    console.assert(result.method === 'position', 'Method should be position');

    await browser.close();
    console.log('✅ Click at position test passed');
    return true;
  } catch (error) {
    console.error('❌ Click at position test failed:', error);
    if (browser) await browser.close();
    return false;
  }
}

/**
 * Test 6: Statistics tracking
 */
async function testStatistics() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 6: Statistics tracking');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let browser;
  try {
    const executablePath = findChrome();
    browser = await puppeteer.launch({
      executablePath,
      headless: HEADLESS,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    const page = await browser.newPage();
    const executor = new VisualActionExecutor(page);

    // Initial stats
    let stats = executor.getStats();
    console.assert(stats.total === 0, 'Total should be 0 initially');

    await page.goto('https://example.com');

    // Execute some actions
    const action = createMockAction('click', {
      visual: {
        text: 'More information',
        position: { absolute: { x: 500, y: 500 }, relative: { x: 50, y: 50 } },
        boundingBox: { x: 400, y: 480, width: 200, height: 40 },
      },
      backup_selector: 'a',
    });

    await executor.executeAction(action);

    // Check stats
    stats = executor.getStats();
    console.assert(stats.total > 0, 'Total should be > 0 after execution');
    console.log('Stats after execution:', stats);

    // Reset stats
    executor.resetStats();
    stats = executor.getStats();
    console.assert(stats.total === 0, 'Total should be 0 after reset');

    await browser.close();
    console.log('✅ Statistics test passed');
    return true;
  } catch (error) {
    console.error('❌ Statistics test failed:', error);
    if (browser) await browser.close();
    return false;
  }
}

/**
 * Test 7: Error handling
 */
async function testErrorHandling() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 7: Error handling');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let browser;
  try {
    const executablePath = findChrome();
    browser = await puppeteer.launch({
      executablePath,
      headless: HEADLESS,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    const page = await browser.newPage();
    const executor = new VisualActionExecutor(page);

    await page.goto('https://example.com');

    // Try to execute action with non-existent element
    const action = createMockAction('click', {
      visual: {
        text: 'NonExistentElement12345',
        position: { absolute: { x: 9999, y: 9999 }, relative: { x: 999, y: 999 } },
        boundingBox: { x: 9999, y: 9999, width: 1, height: 1 },
      },
      backup_selector: '.non-existent-selector-12345',
    });

    const result = await executor.executeAction(action);

    console.assert(result.success === false, 'Action should fail');
    console.assert(result.error, 'Should have error message');
    console.log(`Error handling works: ${result.error}`);

    await browser.close();
    console.log('✅ Error handling test passed');
    return true;
  } catch (error) {
    console.error('❌ Error handling test failed:', error);
    if (browser) await browser.close();
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║   VISUAL EXECUTOR TEST SUITE                  ║');
  console.log('╚═══════════════════════════════════════════════╝');

  const tests = [
    { name: 'Constructor', fn: testConstructor },
    { name: 'Selector Execution', fn: testSelectorExecution },
    { name: 'Text-based Search', fn: testTextBasedSearch },
    { name: 'Position Filtering', fn: testPositionFiltering },
    { name: 'Click at Position', fn: testClickAtPosition },
    { name: 'Statistics', fn: testStatistics },
    { name: 'Error Handling', fn: testErrorHandling },
  ];

  const results = [];

  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed });
    } catch (error) {
      console.error(`\n❌ ${test.name} threw exception:`, error);
      results.push({ name: test.name, passed: false });
    }
  }

  // Summary
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║   TEST SUMMARY                                ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  results.forEach((result) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
  });

  console.log(`\n📊 Total: ${results.length} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED!\n');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED\n');
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
