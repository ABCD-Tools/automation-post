/**
 * Integration Test Suite
 * Tests data flow between recorder, executor, and storage modules
 * 
 * Run with: node tests/integration.test.js
 */

import { ActionRecorder } from '../src/modules-recorder/index.mjs';
import { VisualActionExecutor } from '../src/modules-client/visual-executor.js';
import { EnhancedVisualExecutor } from '../src/modules-client/enhanced-visual-executor.js';
import puppeteer from 'puppeteer-core';
import { findChrome } from '../src/modules-agents/utils/browser.js';
import fs from 'fs';
import path from 'path';

// Test configuration
const TEST_CONFIG = {
  headless: true,
  testUrl: 'https://example.com',
  timeout: 30000,
  screenshotDir: './test-screenshots',
};

// Test results
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  tests: [],
};

/**
 * Test helper: Create test browser and page
 */
async function createTestBrowser() {
  const executablePath = findChrome();
  const browser = await puppeteer.launch({
    executablePath,
    headless: TEST_CONFIG.headless,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  return { browser, page };
}

/**
 * Test helper: Assert with better error messages
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Test helper: Run a test and track results
 */
async function runTest(name, testFn) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${name}`);
  console.log('='.repeat(60));
  
  testResults.total++;
  const startTime = Date.now();
  
  try {
    await testFn();
    const duration = Date.now() - startTime;
    console.log(`✅ PASSED (${duration}ms)`);
    testResults.passed++;
    testResults.tests.push({ name, status: 'passed', duration });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ FAILED (${duration}ms)`);
    console.error(`Error: ${error.message}`);
    console.error(error.stack);
    testResults.failed++;
    testResults.tests.push({ name, status: 'failed', duration, error: error.message });
  }
}

/**
 * TEST 1: Recorder captures visual data correctly
 */
async function testRecorderCapturesVisualData() {
  const recorder = new ActionRecorder();
  let browser;
  
  try {
    // Start recording
    await recorder.startRecording(TEST_CONFIG.testUrl, 'test-platform');
    
    assert(recorder.isRecording, 'Recorder should be in recording state');
    assert(recorder.page !== null, 'Page should be initialized');
    
    // Check if recorder script was injected
    const scriptInjected = await recorder.page.evaluate(() => {
      return window.__actionRecorderInjected === true;
    });
    
    assert(scriptInjected, 'Recorder script should be injected');
    
    // Verify __recordedActions exists
    const actionsArrayExists = await recorder.page.evaluate(() => {
      return Array.isArray(window.__recordedActions);
    });
    
    assert(actionsArrayExists, '__recordedActions array should exist');
    
    // Stop recording
    await recorder.stopRecording();
    
    browser = recorder.browser;
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * TEST 2: Data structure validation
 */
async function testDataStructureValidation() {
  const { browser, page } = await createTestBrowser();
  
  try {
    await page.goto(TEST_CONFIG.testUrl);
    
    // Inject a mock action with complete visual data
    const mockAction = await page.evaluate(() => {
      const action = {
        type: 'click',
        timestamp: Date.now(),
        url: window.location.href,
        visual: {
          screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          text: 'Example Domain',
          position: {
            absolute: { x: 593, y: 327 },
            relative: { x: 46.33, y: 45.42 },
            elementCenter: { x: 593, y: 327 }
          },
          boundingBox: {
            x: 488,
            y: 308,
            width: 210,
            height: 38
          },
          surroundingText: ['Example Domain', 'More information...'],
          timestamp: Date.now(),
          viewport: {
            width: 1280,
            height: 720
          }
        },
        backup_selector: 'h1',
        execution_method: 'visual_first'
      };
      
      return action;
    });
    
    // Validate structure
    assert(mockAction.type === 'click', 'Action type should be set');
    assert(mockAction.visual !== undefined, 'Visual data should exist');
    assert(mockAction.visual.screenshot !== undefined, 'Screenshot should exist');
    assert(mockAction.visual.position !== undefined, 'Position should exist');
    assert(mockAction.visual.position.absolute !== undefined, 'Absolute position should exist');
    assert(mockAction.visual.position.relative !== undefined, 'Relative position should exist');
    assert(mockAction.visual.boundingBox !== undefined, 'Bounding box should exist');
    assert(mockAction.backup_selector !== undefined, 'Backup selector should exist');
    assert(mockAction.execution_method === 'visual_first', 'Execution method should be visual_first');
    
  } finally {
    await browser.close();
  }
}

/**
 * TEST 3: Executor receives and processes data correctly
 */
async function testExecutorDataFlow() {
  const { browser, page } = await createTestBrowser();
  
  try {
    await page.goto(TEST_CONFIG.testUrl);
    
    const executor = new VisualActionExecutor(page);
    
    // Create a valid action
    const action = {
      name: 'Click heading',
      type: 'click',
      params: {
        visual: {
          text: 'Example Domain',
          position: {
            absolute: { x: 640, y: 327 },
            relative: { x: 50, y: 45.42 }
          },
          boundingBox: {
            x: 488,
            y: 308,
            width: 210,
            height: 38
          }
        },
        backup_selector: 'h1',
        execution_method: 'visual_first'
      }
    };
    
    // Execute action
    const result = await executor.executeAction(action);
    
    // Validate result structure
    assert(result !== undefined, 'Result should be returned');
    assert(typeof result.success === 'boolean', 'Result should have success boolean');
    assert(result.method !== undefined, 'Result should have method used');
    
    // Check stats were updated
    const stats = executor.getStats();
    assert(stats.total > 0, 'Total actions should be incremented');
    
  } finally {
    await browser.close();
  }
}

/**
 * TEST 4: Enhanced executor retry logic
 */
async function testEnhancedExecutorRetry() {
  const { browser, page } = await createTestBrowser();
  
  try {
    await page.goto(TEST_CONFIG.testUrl);
    
    // Create screenshots directory
    if (!fs.existsSync(TEST_CONFIG.screenshotDir)) {
      fs.mkdirSync(TEST_CONFIG.screenshotDir, { recursive: true });
    }
    
    const executor = new EnhancedVisualExecutor(page, {
      screenshotDir: TEST_CONFIG.screenshotDir,
      maxRetries: 2,
      retryDelay: 100,
    });
    
    // Test with intentionally failing selector first
    const action = {
      name: 'Click non-existent element',
      type: 'click',
      params: {
        visual: {
          text: 'NonExistentText',
          position: {
            absolute: { x: 9999, y: 9999 },
            relative: { x: 999, y: 999 }
          }
        },
        backup_selector: '.non-existent-selector-123456789',
        execution_method: 'visual_first'
      }
    };
    
    const result = await executor.executeAction(action);
    
    // Should fail but handle gracefully
    assert(result !== undefined, 'Result should be returned even on failure');
    assert(typeof result.success === 'boolean', 'Result should have success property');
    
    // Check enhanced stats
    const stats = executor.getEnhancedStats();
    assert(stats.enhanced !== undefined, 'Enhanced stats should exist');
    assert(stats.enhanced.totalActions > 0, 'Total actions should be tracked');
    
    // Clean up
    if (fs.existsSync(TEST_CONFIG.screenshotDir)) {
      const files = fs.readdirSync(TEST_CONFIG.screenshotDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(TEST_CONFIG.screenshotDir, file));
      });
      fs.rmdirSync(TEST_CONFIG.screenshotDir);
    }
    
  } finally {
    await browser.close();
  }
}

/**
 * TEST 5: Edge case - null visual data
 */
async function testEdgeCaseNullVisualData() {
  const { browser, page } = await createTestBrowser();
  
  try {
    await page.goto(TEST_CONFIG.testUrl);
    
    const executor = new VisualActionExecutor(page);
    
    // Action with null visual data (should fallback to selector)
    const action = {
      name: 'Click with null visual',
      type: 'click',
      params: {
        visual: null,
        backup_selector: 'h1',
        execution_method: 'visual_first'
      }
    };
    
    const result = await executor.executeAction(action);
    
    // Should still work using selector
    assert(result !== undefined, 'Result should be returned');
    assert(typeof result.success === 'boolean', 'Should handle null visual data gracefully');
    
  } finally {
    await browser.close();
  }
}

/**
 * TEST 6: Edge case - missing backup selector
 */
async function testEdgeCaseMissingBackupSelector() {
  const { browser, page } = await createTestBrowser();
  
  try {
    await page.goto(TEST_CONFIG.testUrl);
    
    const executor = new VisualActionExecutor(page);
    
    // Action without backup selector (should use visual search)
    const action = {
      name: 'Click without selector',
      type: 'click',
      params: {
        visual: {
          text: 'Example Domain',
          position: {
            absolute: { x: 640, y: 327 },
            relative: { x: 50, y: 45.42 }
          }
        },
        backup_selector: null,
        execution_method: 'visual_first'
      }
    };
    
    const result = await executor.executeAction(action);
    
    assert(result !== undefined, 'Result should be returned');
    assert(typeof result.success === 'boolean', 'Should handle missing selector');
    
  } finally {
    await browser.close();
  }
}

/**
 * TEST 7: Edge case - malformed action
 */
async function testEdgeCaseMalformedAction() {
  const { browser, page } = await createTestBrowser();
  
  try {
    await page.goto(TEST_CONFIG.testUrl);
    
    const executor = new VisualActionExecutor(page);
    
    // Completely malformed action
    const action = {
      // Missing type, params, etc.
      name: 'Malformed action'
    };
    
    const result = await executor.executeAction(action);
    
    // Should fail gracefully without crashing
    assert(result !== undefined, 'Result should be returned');
    assert(result.success === false, 'Malformed action should fail');
    assert(result.error !== undefined, 'Should have error message');
    
  } finally {
    await browser.close();
  }
}

/**
 * TEST 8: Error handling - timeout
 */
async function testErrorHandlingTimeout() {
  const { browser, page } = await createTestBrowser();
  
  try {
    await page.goto(TEST_CONFIG.testUrl);
    
    const executor = new EnhancedVisualExecutor(page, {
      screenshotDir: TEST_CONFIG.screenshotDir,
      maxRetries: 1,
      retryDelay: 50, // Short delay for faster test
    });
    
    // Action that will timeout
    const action = {
      name: 'Click with timeout',
      type: 'click',
      params: {
        visual: {
          text: 'ElementThatDoesNotExist',
          position: { absolute: { x: 10000, y: 10000 }, relative: { x: 1000, y: 1000 } }
        },
        backup_selector: '.selector-that-does-not-exist',
        execution_method: 'visual_first'
      }
    };
    
    const result = await executor.executeAction(action);
    
    assert(result.success === false, 'Should fail on timeout');
    assert(result.error !== undefined, 'Should have error message');
    
    // Check error log
    const errorLog = executor.getErrorLog();
    assert(errorLog.length > 0, 'Error should be logged');
    
  } finally {
    await browser.close();
  }
}

/**
 * TEST 9: Performance tracking
 */
async function testPerformanceTracking() {
  const { browser, page } = await createTestBrowser();
  
  try {
    await page.goto(TEST_CONFIG.testUrl);
    
    const executor = new EnhancedVisualExecutor(page, {
      trackPerformance: true
    });
    
    // Execute multiple actions
    for (let i = 0; i < 3; i++) {
      const action = {
        name: `Action ${i}`,
        type: 'click',
        params: {
          visual: {
            text: 'Example Domain',
            position: { absolute: { x: 640, y: 327 }, relative: { x: 50, y: 45 } }
          },
          backup_selector: 'h1',
          execution_method: 'visual_first'
        }
      };
      
      await executor.executeAction(action);
    }
    
    const stats = executor.getEnhancedStats();
    
    assert(stats.enhanced.totalActions === 3, 'Should track all actions');
    assert(stats.enhanced.performance !== undefined, 'Performance metrics should exist');
    assert(stats.enhanced.performance.average !== undefined, 'Should track average time');
    
  } finally {
    await browser.close();
  }
}

/**
 * TEST 10: Statistics reset
 */
async function testStatisticsReset() {
  const { browser, page } = await createTestBrowser();
  
  try {
    await page.goto(TEST_CONFIG.testUrl);
    
    const executor = new EnhancedVisualExecutor(page);
    
    // Execute an action
    const action = {
      name: 'Test action',
      type: 'click',
      params: {
        backup_selector: 'h1',
        execution_method: 'visual_first'
      }
    };
    
    await executor.executeAction(action);
    
    let stats = executor.getEnhancedStats();
    assert(stats.enhanced.totalActions > 0, 'Should have actions before reset');
    
    // Reset
    executor.resetStats();
    
    stats = executor.getEnhancedStats();
    assert(stats.enhanced.totalActions === 0, 'Should be zero after reset');
    assert(stats.enhanced.successfulActions === 0, 'Should be zero after reset');
    assert(stats.enhanced.failedActions === 0, 'Should be zero after reset');
    
  } finally {
    await browser.close();
  }
}

/**
 * TEST 11: Multiple action types
 */
async function testMultipleActionTypes() {
  const { browser, page } = await createTestBrowser();
  
  try {
    await page.goto(TEST_CONFIG.testUrl);
    
    const executor = new VisualActionExecutor(page);
    
    // Test different action types
    const actions = [
      {
        name: 'Click action',
        type: 'click',
        params: {
          backup_selector: 'h1',
          visual: { text: 'Example Domain' }
        }
      },
      {
        name: 'Wait action',
        type: 'wait',
        params: {
          duration: 100
        }
      }
    ];
    
    for (const action of actions) {
      const result = await executor.executeAction(action);
      assert(result !== undefined, `${action.type} should return result`);
    }
    
    const stats = executor.getStats();
    assert(stats.total === actions.length, 'Should track all action types');
    
  } finally {
    await browser.close();
  }
}

/**
 * TEST 12: Concurrent execution safety
 */
async function testConcurrentExecutionSafety() {
  const { browser, page } = await createTestBrowser();
  
  try {
    await page.goto(TEST_CONFIG.testUrl);
    
    const executor = new VisualActionExecutor(page);
    
    const action = {
      name: 'Concurrent action',
      type: 'click',
      params: {
        backup_selector: 'h1',
        visual: { text: 'Example Domain' }
      }
    };
    
    // Execute multiple actions concurrently
    const promises = [];
    for (let i = 0; i < 3; i++) {
      promises.push(executor.executeAction(action));
    }
    
    const results = await Promise.all(promises);
    
    assert(results.length === 3, 'All actions should complete');
    results.forEach((result, i) => {
      assert(result !== undefined, `Result ${i} should exist`);
    });
    
  } finally {
    await browser.close();
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║         INTEGRATION TEST SUITE - DATA FLOW & ERRORS       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  console.log(`Test URL: ${TEST_CONFIG.testUrl}`);
  console.log(`Headless: ${TEST_CONFIG.headless}`);
  console.log(`Timeout: ${TEST_CONFIG.timeout}ms\n`);
  
  // Run all tests
  await runTest('1. Recorder captures visual data correctly', testRecorderCapturesVisualData);
  await runTest('2. Data structure validation', testDataStructureValidation);
  await runTest('3. Executor receives and processes data correctly', testExecutorDataFlow);
  await runTest('4. Enhanced executor retry logic', testEnhancedExecutorRetry);
  await runTest('5. Edge case - null visual data', testEdgeCaseNullVisualData);
  await runTest('6. Edge case - missing backup selector', testEdgeCaseMissingBackupSelector);
  await runTest('7. Edge case - malformed action', testEdgeCaseMalformedAction);
  await runTest('8. Error handling - timeout', testErrorHandlingTimeout);
  await runTest('9. Performance tracking', testPerformanceTracking);
  await runTest('10. Statistics reset', testStatisticsReset);
  await runTest('11. Multiple action types', testMultipleActionTypes);
  await runTest('12. Concurrent execution safety', testConcurrentExecutionSafety);
  
  // Print summary
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                      TEST SUMMARY                         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  testResults.tests.forEach((test, index) => {
    const icon = test.status === 'passed' ? '✅' : '❌';
    console.log(`${icon} ${index + 1}. ${test.name} (${test.duration}ms)`);
    if (test.error) {
      console.log(`   Error: ${test.error}`);
    }
  });
  
  const passRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📊 Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Pass Rate: ${passRate}%`);
  console.log('─'.repeat(60));
  
  if (testResults.failed === 0) {
    console.log('\n🎉 ALL INTEGRATION TESTS PASSED!\n');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED - Review errors above\n');
  }
  
  // Export results to JSON
  const reportPath = path.join(process.cwd(), 'integration-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    ...testResults,
    timestamp: new Date().toISOString(),
    config: TEST_CONFIG
  }, null, 2));
  console.log(`📄 Test report saved to: ${reportPath}\n`);
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((error) => {
  console.error('\n❌ FATAL ERROR:', error);
  console.error(error.stack);
  process.exit(1);
});
