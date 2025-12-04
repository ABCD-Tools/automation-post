/**
 * Enhanced Visual Executor Validation Script
 * 
 * Validates the implementation without requiring a browser
 * Tests class structure, methods, and configuration
 * 
 * Run with: node src/modules-client/enhanced-visual-executor-validation.js
 */

import { EnhancedVisualExecutor } from './enhanced-visual-executor.js';

console.log('╔═══════════════════════════════════════════════╗');
console.log('║  ENHANCED VISUAL EXECUTOR VALIDATION          ║');
console.log('╚═══════════════════════════════════════════════╝\n');

let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passedTests++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    failedTests++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

// Create mock page object for testing
const mockPage = {
  screenshot: async () => {},
  evaluate: async () => ({}),
  waitForTimeout: async () => {},
};

// Test 1: Class instantiation
test('EnhancedVisualExecutor can be instantiated', () => {
  const executor = new EnhancedVisualExecutor(mockPage);
  assert(executor !== null);
  assert(executor instanceof EnhancedVisualExecutor);
});

// Test 2: Default options
test('Default options are set correctly', () => {
  const executor = new EnhancedVisualExecutor(mockPage);
  assertEquals(executor.options.screenshotOnError, true);
  assertEquals(executor.options.enableRetry, true);
  assertEquals(executor.options.maxRetries, 3);
  assertEquals(executor.options.initialPositionTolerance, 15);
  assertEquals(executor.options.relaxedPositionTolerance, 30);
  assertEquals(executor.options.initialSimilarityThreshold, 0.7);
  assertEquals(executor.options.relaxedSimilarityThreshold, 0.5);
});

// Test 3: Custom options
test('Custom options override defaults', () => {
  const executor = new EnhancedVisualExecutor(mockPage, {
    maxRetries: 5,
    initialPositionTolerance: 20,
    relaxedPositionTolerance: 40,
  });
  assertEquals(executor.options.maxRetries, 5);
  assertEquals(executor.options.initialPositionTolerance, 20);
  assertEquals(executor.options.relaxedPositionTolerance, 40);
});

// Test 4: Enhanced statistics initialization
test('Enhanced statistics are initialized correctly', () => {
  const executor = new EnhancedVisualExecutor(mockPage);
  const stats = executor.getEnhancedStats();
  
  assert(stats.enhanced !== undefined);
  assertEquals(stats.enhanced.totalActions, 0);
  assertEquals(stats.enhanced.successfulActions, 0);
  assertEquals(stats.enhanced.failedActions, 0);
  assertEquals(stats.enhanced.retriedActions, 0);
  assert(stats.enhanced.methodBreakdown !== undefined);
  assert(stats.enhanced.performance !== undefined);
});

// Test 5: Position tolerance calculation
test('Position tolerance relaxes on retry', () => {
  const executor = new EnhancedVisualExecutor(mockPage, {
    initialPositionTolerance: 10,
    relaxedPositionTolerance: 30,
    maxRetries: 2,
  });
  
  const tolerance0 = executor.getPositionTolerance(0);
  const tolerance1 = executor.getPositionTolerance(1);
  const tolerance2 = executor.getPositionTolerance(2);
  
  assertEquals(tolerance0, 10, 'Initial tolerance should be 10');
  assert(tolerance1 > tolerance0, 'Retry 1 tolerance should be greater than initial');
  assert(tolerance2 > tolerance1, 'Retry 2 tolerance should be greater than retry 1');
  assert(tolerance2 <= 30, 'Tolerance should not exceed relaxed max');
});

// Test 6: Similarity threshold calculation
test('Similarity threshold relaxes on retry', () => {
  const executor = new EnhancedVisualExecutor(mockPage, {
    initialSimilarityThreshold: 0.8,
    relaxedSimilarityThreshold: 0.5,
    maxRetries: 2,
  });
  
  const threshold0 = executor.getSimilarityThreshold(0);
  const threshold1 = executor.getSimilarityThreshold(1);
  const threshold2 = executor.getSimilarityThreshold(2);
  
  assertEquals(threshold0, 0.8, 'Initial threshold should be 0.8');
  assert(threshold1 < threshold0, 'Retry 1 threshold should be less than initial');
  assert(threshold2 < threshold1, 'Retry 2 threshold should be less than retry 1');
  assert(threshold2 >= 0.5, 'Threshold should not go below relaxed min');
});

// Test 7: Error categorization
test('Error categorization works correctly', () => {
  const executor = new EnhancedVisualExecutor(mockPage);
  
  assertEquals(executor.categorizeError('Timeout exceeded'), 'timeout');
  assertEquals(executor.categorizeError('Element not found'), 'element_not_found');
  assertEquals(executor.categorizeError('Text mismatch detected'), 'text_mismatch');
  assertEquals(executor.categorizeError('Position does not match'), 'position_mismatch');
  assertEquals(executor.categorizeError('Visual comparison failed'), 'visual_mismatch');
  assertEquals(executor.categorizeError('Selector failed'), 'selector_failed');
  assertEquals(executor.categorizeError('Some unknown error'), 'unknown');
});

// Test 8: Error log initialization
test('Error log is initialized empty', () => {
  const executor = new EnhancedVisualExecutor(mockPage);
  const errorLog = executor.getErrorLog();
  
  assert(Array.isArray(errorLog));
  assertEquals(errorLog.length, 0);
});

// Test 9: Method tracking structure
test('Method tracking has correct structure', () => {
  const executor = new EnhancedVisualExecutor(mockPage);
  const stats = executor.getEnhancedStats();
  
  assert(stats.enhanced.methodBreakdown.selector !== undefined);
  assert(stats.enhanced.methodBreakdown.text !== undefined);
  assert(stats.enhanced.methodBreakdown.visual !== undefined);
  assert(stats.enhanced.methodBreakdown.position !== undefined);
  assert(stats.enhanced.methodBreakdown.none !== undefined);
});

// Test 10: Performance metrics structure
test('Performance metrics have correct structure', () => {
  const executor = new EnhancedVisualExecutor(mockPage);
  const stats = executor.getEnhancedStats();
  
  assert(stats.enhanced.performance.average !== undefined);
  assert(stats.enhanced.performance.min !== undefined);
  assert(stats.enhanced.performance.max !== undefined);
});

// Test 11: Retry statistics structure
test('Retry statistics have correct structure', () => {
  const executor = new EnhancedVisualExecutor(mockPage);
  const stats = executor.getEnhancedStats();
  
  assert(stats.enhanced.retriesByAttempt !== undefined);
});

// Test 12: Reset functionality
test('Reset clears all statistics', () => {
  const executor = new EnhancedVisualExecutor(mockPage);
  
  // Manually set some values
  executor.enhancedStats.totalActions = 10;
  executor.enhancedStats.successfulActions = 8;
  executor.enhancedStats.failedActions = 2;
  executor.errorLog.push({ test: 'error' });
  
  // Reset
  executor.resetStats();
  
  const stats = executor.getEnhancedStats();
  assertEquals(stats.enhanced.totalActions, 0);
  assertEquals(stats.enhanced.successfulActions, 0);
  assertEquals(stats.enhanced.failedActions, 0);
  assertEquals(executor.getErrorLog().length, 0);
});

// Test 13: Inheritance check
test('EnhancedVisualExecutor extends VisualActionExecutor', () => {
  const executor = new EnhancedVisualExecutor(mockPage);
  
  // Should have parent class methods
  assert(typeof executor.executeAction === 'function');
  assert(typeof executor.findByText === 'function');
  assert(typeof executor.filterByPosition === 'function');
  assert(typeof executor.clickAtPosition === 'function');
  assert(typeof executor.getStats === 'function');
});

// Test 14: Additional methods exist
test('EnhancedVisualExecutor has additional methods', () => {
  const executor = new EnhancedVisualExecutor(mockPage);
  
  assert(typeof executor.getEnhancedStats === 'function');
  assert(typeof executor.printStatsReport === 'function');
  assert(typeof executor.exportStats === 'function');
  assert(typeof executor.getErrorLog === 'function');
  assert(typeof executor.logDetailedError === 'function');
  assert(typeof executor.categorizeError === 'function');
  assert(typeof executor.getPositionTolerance === 'function');
  assert(typeof executor.getSimilarityThreshold === 'function');
  assert(typeof executor.updatePerformanceMetrics === 'function');
});

// Test 15: Performance metrics update
test('Performance metrics update correctly', () => {
  const executor = new EnhancedVisualExecutor(mockPage);
  
  executor.updatePerformanceMetrics(100);
  executor.updatePerformanceMetrics(200);
  executor.updatePerformanceMetrics(150);
  
  const stats = executor.getEnhancedStats();
  
  // Check that values were recorded
  assert(executor.enhancedStats.executionTimes.length === 3);
  assert(executor.enhancedStats.minExecutionTime === 100);
  assert(executor.enhancedStats.maxExecutionTime === 200);
  assert(executor.enhancedStats.averageExecutionTime === 150);
});

// Print summary
console.log('\n╔═══════════════════════════════════════════════╗');
console.log('║              VALIDATION SUMMARY               ║');
console.log('╚═══════════════════════════════════════════════╝\n');

const total = passedTests + failedTests;
const successRate = ((passedTests / total) * 100).toFixed(1);

console.log(`Total tests: ${total}`);
console.log(`Passed: ${passedTests} ✅`);
console.log(`Failed: ${failedTests} ❌`);
console.log(`Success rate: ${successRate}%\n`);

if (failedTests === 0) {
  console.log('🎉 All validation tests passed!');
  console.log('✅ EnhancedVisualExecutor implementation is correct\n');
  process.exit(0);
} else {
  console.log('⚠️  Some validation tests failed');
  console.log('❌ Please review the implementation\n');
  process.exit(1);
}
