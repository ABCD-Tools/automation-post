/**
 * Edge Cases and Error Handling Test Suite
 * 
 * Tests various edge cases, error conditions, and boundary scenarios
 * Run with: node tests/edge-cases.test.js
 */

import { VisualActionExecutor } from '../src/modules-client/visual-executor.js';
import { EnhancedVisualExecutor } from '../src/modules-client/enhanced-visual-executor.js';
import puppeteer from 'puppeteer-core';
import { findChrome } from '../src/modules-agents/utils/browser.js';

const TEST_CONFIG = {
  headless: true,
  timeout: 10000,
};

const results = { passed: 0, failed: 0, tests: [] };

async function runTest(name, fn) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${name}`);
  console.log('='.repeat(60));
  
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    console.log(`✅ PASSED (${duration}ms)`);
    results.passed++;
    results.tests.push({ name, status: 'passed', duration });
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`❌ FAILED (${duration}ms)`);
    console.error(`Error: ${error.message}`);
    results.failed++;
    results.tests.push({ name, status: 'failed', duration, error: error.message });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function createBrowser() {
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
 * EDGE CASE 1: Empty action parameters
 */
async function testEmptyActionParams() {
  const { browser, page } = await createBrowser();
  try {
    await page.goto('https://example.com');
    const executor = new VisualActionExecutor(page);
    
    const action = {
      name: 'Empty params',
      type: 'click',
      params: {}
    };
    
    const result = await executor.executeAction(action);
    assert(result !== undefined, 'Should return result');
    assert(result.success === false, 'Should fail with empty params');
  } finally {
    await browser.close();
  }
}

/**
 * EDGE CASE 2: Invalid position coordinates (negative values)
 */
async function testNegativeCoordinates() {
  const { browser, page } = await createBrowser();
  try {
    await page.goto('https://example.com');
    const executor = new VisualActionExecutor(page);
    
    const action = {
      name: 'Negative coords',
      type: 'click',
      params: {
        visual: {
          position: {
            absolute: { x: -100, y: -200 },
            relative: { x: -10, y: -20 }
          }
        },
        backup_selector: 'h1'
      }
    };
    
    const result = await executor.executeAction(action);
    assert(result !== undefined, 'Should handle negative coordinates');
  } finally {
    await browser.close();
  }
}

/**
 * EDGE CASE 3: Position coordinates beyond viewport
 */
async function testCoordinatesBeyondViewport() {
  const { browser, page } = await createBrowser();
  try {
    await page.goto('https://example.com');
    const executor = new VisualActionExecutor(page);
    
    const action = {
      name: 'Out of bounds',
      type: 'click',
      params: {
        visual: {
          position: {
            absolute: { x: 50000, y: 50000 },
            relative: { x: 5000, y: 5000 }
          }
        },
        backup_selector: 'h1'
      }
    };
    
    const result = await executor.executeAction(action);
    assert(result !== undefined, 'Should handle out-of-bounds coordinates');
  } finally {
    await browser.close();
  }
}

/**
 * EDGE CASE 4: Empty text search
 */
async function testEmptyTextSearch() {
  const { browser, page } = await createBrowser();
  try {
    await page.goto('https://example.com');
    const executor = new VisualActionExecutor(page);
    
    const action = {
      name: 'Empty text',
      type: 'click',
      params: {
        visual: {
          text: '',
          position: { absolute: { x: 100, y: 100 } }
        },
        backup_selector: 'h1'
      }
    };
    
    const result = await executor.executeAction(action);
    assert(result !== undefined, 'Should handle empty text');
  } finally {
    await browser.close();
  }
}

/**
 * EDGE CASE 5: Very long text search
 */
async function testVeryLongTextSearch() {
  const { browser, page } = await createBrowser();
  try {
    await page.goto('https://example.com');
    const executor = new VisualActionExecutor(page);
    
    const longText = 'A'.repeat(10000);
    
    const action = {
      name: 'Long text',
      type: 'click',
      params: {
        visual: {
          text: longText,
          position: { absolute: { x: 100, y: 100 } }
        },
        backup_selector: 'h1'
      }
    };
    
    const result = await executor.executeAction(action);
    assert(result !== undefined, 'Should handle very long text');
  } finally {
    await browser.close();
  }
}

/**
 * EDGE CASE 6: Special characters in text
 */
async function testSpecialCharactersInText() {
  const { browser, page } = await createBrowser();
  try {
    await page.goto('https://example.com');
    const executor = new VisualActionExecutor(page);
    
    const action = {
      name: 'Special chars',
      type: 'click',
      params: {
        visual: {
          text: '!@#$%^&*()[]{}|\\/<>?"\':;',
          position: { absolute: { x: 100, y: 100 } }
        },
        backup_selector: 'h1'
      }
    };
    
    const result = await executor.executeAction(action);
    assert(result !== undefined, 'Should handle special characters');
  } finally {
    await browser.close();
  }
}

/**
 * EDGE CASE 7: Unicode and emoji in text
 */
async function testUnicodeAndEmoji() {
  const { browser, page } = await createBrowser();
  try {
    await page.goto('https://example.com');
    const executor = new VisualActionExecutor(page);
    
    const action = {
      name: 'Unicode',
      type: 'click',
      params: {
        visual: {
          text: '你好世界 🌍 مرحبا العالم',
          position: { absolute: { x: 100, y: 100 } }
        },
        backup_selector: 'h1'
      }
    };
    
    const result = await executor.executeAction(action);
    assert(result !== undefined, 'Should handle unicode and emoji');
  } finally {
    await browser.close();
  }
}

/**
 * EDGE CASE 8: Null and undefined values
 */
async function testNullAndUndefinedValues() {
  const { browser, page } = await createBrowser();
  try {
    await page.goto('https://example.com');
    const executor = new VisualActionExecutor(page);
    
    const actions = [
      { name: 'Null visual', type: 'click', params: { visual: null, backup_selector: 'h1' } },
      { name: 'Undefined visual', type: 'click', params: { visual: undefined, backup_selector: 'h1' } },
      { name: 'Null selector', type: 'click', params: { visual: {}, backup_selector: null } },
    ];
    
    for (const action of actions) {
      const result = await executor.executeAction(action);
      assert(result !== undefined, `Should handle ${action.name}`);
    }
  } finally {
    await browser.close();
  }
}

/**
 * EDGE CASE 9: Invalid action type
 */
async function testInvalidActionType() {
  const { browser, page } = await createBrowser();
  try {
    await page.goto('https://example.com');
    const executor = new VisualActionExecutor(page);
    
    const action = {
      name: 'Invalid type',
      type: 'invalid_action_type_xyz',
      params: {
        backup_selector: 'h1'
      }
    };
    
    const result = await executor.executeAction(action);
    assert(result !== undefined, 'Should handle invalid action type');
  } finally {
    await browser.close();
  }
}

/**
 * EDGE CASE 10: Circular reference in action object
 */
async function testCircularReference() {
  const { browser, page } = await createBrowser();
  try {
    await page.goto('https://example.com');
    const executor = new VisualActionExecutor(page);
    
    const action = {
      name: 'Circular ref',
      type: 'click',
      params: {
        backup_selector: 'h1'
      }
    };
    action.self = action; // Create circular reference
    
    const result = await executor.executeAction(action);
    assert(result !== undefined, 'Should handle circular references');
  } finally {
    await browser.close();
  }
}

/**
 * ERROR HANDLING 1: Network timeout during page load
 */
async function testNetworkTimeout() {
  const { browser, page } = await createBrowser();
  try {
    // Try to navigate to non-existent domain
    try {
      await page.goto('http://this-domain-does-not-exist-12345.com', { 
        timeout: 3000 
      });
    } catch (e) {
      // Expected to fail
    }
    
    const executor = new VisualActionExecutor(page);
    const action = {
      name: 'Action on failed page',
      type: 'click',
      params: { backup_selector: 'h1' }
    };
    
    const result = await executor.executeAction(action);
    assert(result !== undefined, 'Should handle network timeout gracefully');
  } finally {
    await browser.close();
  }
}

/**
 * ERROR HANDLING 2: Page closed during execution
 */
async function testPageClosedDuringExecution() {
  const { browser, page } = await createBrowser();
  try {
    await page.goto('https://example.com');
    const executor = new VisualActionExecutor(page);
    
    const action = {
      name: 'Action on closing page',
      type: 'click',
      params: { backup_selector: 'h1' }
    };
    
    // Close page immediately
    await page.close();
    
    try {
      await executor.executeAction(action);
    } catch (error) {
      assert(error.message.includes('closed') || error.message.includes('Target'), 
        'Should throw appropriate error');
    }
  } finally {
    try { await browser.close(); } catch (e) {}
  }
}

/**
 * ERROR HANDLING 3: Multiple rapid actions
 */
async function testRapidActions() {
  const { browser, page } = await createBrowser();
  try {
    await page.goto('https://example.com');
    const executor = new EnhancedVisualExecutor(page, { maxRetries: 1 });
    
    const actions = Array(10).fill(null).map((_, i) => ({
      name: `Rapid action ${i}`,
      type: 'click',
      params: { backup_selector: 'h1' }
    }));
    
    const results = await Promise.all(
      actions.map(action => executor.executeAction(action))
    );
    
    assert(results.length === 10, 'Should handle rapid actions');
    assert(results.every(r => r !== undefined), 'All should return results');
  } finally {
    await browser.close();
  }
}

/**
 * ERROR HANDLING 4: Memory-intensive screenshot data
 */
async function testLargeScreenshotData() {
  const { browser, page } = await createBrowser();
  try {
    await page.goto('https://example.com');
    const executor = new VisualActionExecutor(page);
    
    // Create a very large base64 string (simulating large screenshot)
    const largeScreenshot = 'data:image/png;base64,' + 'A'.repeat(1000000); // 1MB
    
    const action = {
      name: 'Large screenshot',
      type: 'click',
      params: {
        visual: {
          screenshot: largeScreenshot,
          position: { absolute: { x: 100, y: 100 } }
        },
        backup_selector: 'h1'
      }
    };
    
    const result = await executor.executeAction(action);
    assert(result !== undefined, 'Should handle large screenshot data');
  } finally {
    await browser.close();
  }
}

/**
 * ERROR HANDLING 5: Invalid selector syntax
 */
async function testInvalidSelectorSyntax() {
  const { browser, page } = await createBrowser();
  try {
    await page.goto('https://example.com');
    const executor = new VisualActionExecutor(page);
    
    const invalidSelectors = [
      '>>>invalid<<<',
      '[[[broken]]]',
      '::::::',
      'div..double-dot',
      'div#id#another-id',
    ];
    
    for (const selector of invalidSelectors) {
      const action = {
        name: `Invalid selector: ${selector}`,
        type: 'click',
        params: { backup_selector: selector }
      };
      
      const result = await executor.executeAction(action);
      assert(result !== undefined, `Should handle invalid selector: ${selector}`);
    }
  } finally {
    await browser.close();
  }
}

/**
 * ERROR HANDLING 6: Zero-size bounding box
 */
async function testZeroSizeBoundingBox() {
  const { browser, page } = await createBrowser();
  try {
    await page.goto('https://example.com');
    const executor = new VisualActionExecutor(page);
    
    const action = {
      name: 'Zero-size box',
      type: 'click',
      params: {
        visual: {
          boundingBox: { x: 100, y: 100, width: 0, height: 0 },
          position: { absolute: { x: 100, y: 100 } }
        },
        backup_selector: 'h1'
      }
    };
    
    const result = await executor.executeAction(action);
    assert(result !== undefined, 'Should handle zero-size bounding box');
  } finally {
    await browser.close();
  }
}

/**
 * ERROR HANDLING 7: Retry exhaustion
 */
async function testRetryExhaustion() {
  const { browser, page } = await createBrowser();
  try {
    await page.goto('https://example.com');
    const executor = new EnhancedVisualExecutor(page, {
      maxRetries: 3,
      retryDelay: 50,
    });
    
    const action = {
      name: 'Will fail all retries',
      type: 'click',
      params: {
        visual: {
          text: 'NonExistentElement12345',
          position: { absolute: { x: 9999, y: 9999 } }
        },
        backup_selector: '.non-existent-selector-12345'
      }
    };
    
    const result = await executor.executeAction(action);
    
    assert(result.success === false, 'Should fail after retries exhausted');
    assert(result.retryCount !== undefined, 'Should track retry count');
    
    const stats = executor.getEnhancedStats();
    assert(stats.enhanced.failedActions > 0, 'Should track failed actions');
  } finally {
    await browser.close();
  }
}

/**
 * ERROR HANDLING 8: JavaScript execution errors
 */
async function testJavaScriptExecutionErrors() {
  const { browser, page } = await createBrowser();
  try {
    await page.goto('https://example.com');
    const executor = new VisualActionExecutor(page);
    
    // Try to execute findByText which might throw errors internally
    const result = await executor.findByText('Example');
    
    assert(Array.isArray(result), 'Should return array even with internal errors');
  } finally {
    await browser.close();
  }
}

/**
 * BOUNDARY CASE 1: Minimum valid action
 */
async function testMinimumValidAction() {
  const { browser, page } = await createBrowser();
  try {
    await page.goto('https://example.com');
    const executor = new VisualActionExecutor(page);
    
    const action = {
      type: 'click',
      params: {
        backup_selector: 'h1'
      }
    };
    
    const result = await executor.executeAction(action);
    assert(result !== undefined, 'Should handle minimum valid action');
  } finally {
    await browser.close();
  }
}

/**
 * BOUNDARY CASE 2: Maximum position tolerance
 */
async function testMaxPositionTolerance() {
  const { browser, page } = await createBrowser();
  try {
    await page.goto('https://example.com');
    const executor = new VisualActionExecutor(page);
    
    const candidates = [
      { position: { relative: { x: 50, y: 50 } }, text: 'A' },
      { position: { relative: { x: 100, y: 100 } }, text: 'B' },
    ];
    
    // Test with very large tolerance
    const filtered = executor.filterByPosition(candidates, { x: 50, y: 50 }, 100);
    assert(filtered.length === 2, 'Should include all with max tolerance');
  } finally {
    await browser.close();
  }
}

/**
 * BOUNDARY CASE 3: Zero position tolerance
 */
async function testZeroPositionTolerance() {
  const { browser, page } = await createBrowser();
  try {
    await page.goto('https://example.com');
    const executor = new VisualActionExecutor(page);
    
    const candidates = [
      { position: { relative: { x: 50, y: 50 } }, text: 'A' },
      { position: { relative: { x: 50.1, y: 50.1 } }, text: 'B' },
    ];
    
    // Test with zero tolerance
    const filtered = executor.filterByPosition(candidates, { x: 50, y: 50 }, 0);
    assert(filtered.length === 1, 'Should be exact match only');
  } finally {
    await browser.close();
  }
}

/**
 * Main runner
 */
async function runAllTests() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║           EDGE CASES & ERROR HANDLING TEST SUITE          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  // Edge cases
  await runTest('Edge 1: Empty action parameters', testEmptyActionParams);
  await runTest('Edge 2: Negative coordinates', testNegativeCoordinates);
  await runTest('Edge 3: Coordinates beyond viewport', testCoordinatesBeyondViewport);
  await runTest('Edge 4: Empty text search', testEmptyTextSearch);
  await runTest('Edge 5: Very long text search', testVeryLongTextSearch);
  await runTest('Edge 6: Special characters in text', testSpecialCharactersInText);
  await runTest('Edge 7: Unicode and emoji', testUnicodeAndEmoji);
  await runTest('Edge 8: Null and undefined values', testNullAndUndefinedValues);
  await runTest('Edge 9: Invalid action type', testInvalidActionType);
  await runTest('Edge 10: Circular reference', testCircularReference);
  
  // Error handling
  await runTest('Error 1: Network timeout', testNetworkTimeout);
  await runTest('Error 2: Page closed during execution', testPageClosedDuringExecution);
  await runTest('Error 3: Multiple rapid actions', testRapidActions);
  await runTest('Error 4: Large screenshot data', testLargeScreenshotData);
  await runTest('Error 5: Invalid selector syntax', testInvalidSelectorSyntax);
  await runTest('Error 6: Zero-size bounding box', testZeroSizeBoundingBox);
  await runTest('Error 7: Retry exhaustion', testRetryExhaustion);
  await runTest('Error 8: JavaScript execution errors', testJavaScriptExecutionErrors);
  
  // Boundary cases
  await runTest('Boundary 1: Minimum valid action', testMinimumValidAction);
  await runTest('Boundary 2: Maximum position tolerance', testMaxPositionTolerance);
  await runTest('Boundary 3: Zero position tolerance', testZeroPositionTolerance);
  
  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                      TEST SUMMARY                         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  results.tests.forEach((test, i) => {
    const icon = test.status === 'passed' ? '✅' : '❌';
    console.log(`${icon} ${i + 1}. ${test.name} (${test.duration}ms)`);
  });
  
  const passRate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(1);
  
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Total: ${results.passed + results.failed} | ✅ ${results.passed} | ❌ ${results.failed} | ${passRate}%`);
  console.log('─'.repeat(60));
  
  if (results.failed === 0) {
    console.log('\n🎉 ALL EDGE CASE TESTS PASSED!\n');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED\n');
  }
  
  process.exit(results.failed > 0 ? 1 : 0);
}

runAllTests().catch((error) => {
  console.error('\n❌ FATAL:', error);
  process.exit(1);
});
