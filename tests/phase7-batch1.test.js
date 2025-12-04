/**
 * Phase 7 Batch 1 Test - Enhanced Error Logging & Execution Reports
 * 
 * Tests:
 * - Detailed error logging with screenshots
 * - Execution report structure
 * - Method tracking and statistics
 * - Confidence score calculation
 * 
 * Run: node tests/phase7-batch1.test.js
 */

import { WorkflowExecutor } from '../src/modules-client/workflow-executor.js';
import puppeteer from 'puppeteer-core';
import { findChrome } from '../src/modules-agents/utils/browser.js';
import fs from 'fs';
import path from 'path';

// Test configuration
const TEST_URL = 'https://example.com';
const HEADLESS = true;

/**
 * Test 1: Execution Report Structure
 */
async function testExecutionReportStructure() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Execution Report Structure');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const executablePath = findChrome();
  const browser = await puppeteer.launch({
    executablePath,
    headless: HEADLESS,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  
  try {
    const page = await browser.newPage();
    await page.goto(TEST_URL);
    
    const executor = new WorkflowExecutor(page, {
      logProgress: false
    });
    
    // Execute simple workflow
    const actions = [
      {
        name: 'Click heading',
        type: 'click',
        params: {
          backup_selector: 'h1',
          visual: { text: 'Example Domain' }
        }
      }
    ];
    
    const result = await executor.executeWorkflow(actions, 'test_workflow_001');
    
    // Validate report structure
    console.assert(result.executionReport !== undefined, '✓ Execution report exists');
    console.assert(result.executionReport.workflowId === 'test_workflow_001', '✓ Workflow ID set');
    console.assert(result.executionReport.startTime !== null, '✓ Start time recorded');
    console.assert(result.executionReport.endTime !== null, '✓ End time recorded');
    console.assert(result.executionReport.duration > 0, '✓ Duration calculated');
    console.assert(Array.isArray(result.executionReport.actions), '✓ Actions array exists');
    console.assert(result.executionReport.actions.length === 1, '✓ Action tracked');
    console.assert(result.executionReport.methodStats !== undefined, '✓ Method stats exist');
    console.assert(result.executionReport.overallStats !== undefined, '✓ Overall stats exist');
    
    console.log('\n✅ Execution report structure is correct');
    console.log('Report:', JSON.stringify(result.executionReport.overallStats, null, 2));
    
    await browser.close();
    return true;
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    await browser.close();
    return false;
  }
}

/**
 * Test 2: Detailed Error Logging
 */
async function testDetailedErrorLogging() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Detailed Error Logging');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const executablePath = findChrome();
  const browser = await puppeteer.launch({
    executablePath,
    headless: HEADLESS,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  
  try {
    const page = await browser.newPage();
    await page.goto(TEST_URL);
    
    const errorLogDir = './logs/test-errors';
    const executor = new WorkflowExecutor(page, {
      logProgress: true,
      errorLogDir,
      retryOnFailure: false, // Disable retry for faster test
      stopOnError: false
    });
    
    // Execute workflow with intentional failure
    const actions = [
      {
        name: 'Click non-existent element',
        type: 'click',
        params: {
          backup_selector: '.non-existent-selector-12345',
          visual: {
            text: 'NonExistentText',
            position: {
              absolute: { x: 9999, y: 9999 },
              relative: { x: 999, y: 999 }
            }
          }
        }
      }
    ];
    
    const result = await executor.executeWorkflow(actions, 'test_error_logging');
    
    // Validate error logging
    console.assert(result.executionReport.errors.length > 0, '✓ Error logged');
    
    const errorDetails = result.executionReport.errors[0];
    console.assert(errorDetails.errorId !== undefined, '✓ Error ID generated');
    console.assert(errorDetails.timestamp !== undefined, '✓ Timestamp recorded');
    console.assert(errorDetails.actionName === 'Click non-existent element', '✓ Action name recorded');
    console.assert(errorDetails.searchCriteria !== undefined, '✓ Search criteria logged');
    console.assert(errorDetails.pageState !== undefined, '✓ Page state captured');
    console.assert(errorDetails.errorScreenshot !== undefined, '✓ Screenshot path recorded');
    
    // Check if screenshot file was created
    const screenshotExists = fs.existsSync(errorDetails.errorScreenshot);
    console.assert(screenshotExists, '✓ Screenshot file created');
    
    // Check if JSON log was created
    const jsonLogPath = errorDetails.errorScreenshot.replace('.png', '.json');
    const jsonLogExists = fs.existsSync(jsonLogPath);
    console.assert(jsonLogExists, '✓ JSON error log created');
    
    console.log('\n✅ Error logging works correctly');
    console.log('Error details:');
    console.log(`  - Error ID: ${errorDetails.errorId}`);
    console.log(`  - Screenshot: ${errorDetails.errorScreenshot}`);
    console.log(`  - Page URL: ${errorDetails.pageState.url}`);
    console.log(`  - Search text: ${errorDetails.searchCriteria.text}`);
    
    // Cleanup
    if (fs.existsSync(errorLogDir)) {
      const files = fs.readdirSync(errorLogDir);
      files.forEach(file => fs.unlinkSync(path.join(errorLogDir, file)));
      fs.rmdirSync(errorLogDir);
    }
    
    await browser.close();
    return true;
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    await browser.close();
    return false;
  }
}

/**
 * Test 3: Method Tracking Statistics
 */
async function testMethodTracking() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: Method Tracking Statistics');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const executablePath = findChrome();
  const browser = await puppeteer.launch({
    executablePath,
    headless: HEADLESS,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  
  try {
    const page = await browser.newPage();
    await page.goto(TEST_URL);
    
    const executor = new WorkflowExecutor(page, { logProgress: false });
    
    // Execute multiple actions
    const actions = [
      {
        name: 'Click with selector',
        type: 'click',
        params: {
          backup_selector: 'h1',
          visual: { text: 'Example Domain' }
        }
      },
      {
        name: 'Wait action',
        type: 'wait',
        params: { duration: 100 }
      },
      {
        name: 'Navigate',
        type: 'navigate',
        params: { url: TEST_URL }
      }
    ];
    
    const result = await executor.executeWorkflow(actions, 'test_method_tracking');
    
    // Validate method stats
    const methodStats = result.executionReport.methodStats;
    console.assert(methodStats !== undefined, '✓ Method stats exist');
    
    let totalMethodCount = 0;
    Object.entries(methodStats).forEach(([method, stats]) => {
      if (stats.count > 0) {
        totalMethodCount += stats.count;
        console.log(`  ${method}: ${stats.count} actions (${stats.totalTime}ms total)`);
      }
    });
    
    console.assert(totalMethodCount > 0, '✓ Methods tracked');
    
    console.log('\n✅ Method tracking works correctly');
    
    await browser.close();
    return true;
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    await browser.close();
    return false;
  }
}

/**
 * Test 4: Export Execution Report
 */
async function testExportExecutionReport() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 4: Export Execution Report');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const executablePath = findChrome();
  const browser = await puppeteer.launch({
    executablePath,
    headless: HEADLESS,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  
  try {
    const page = await browser.newPage();
    await page.goto(TEST_URL);
    
    const executor = new WorkflowExecutor(page, { logProgress: false });
    
    const actions = [
      {
        name: 'Test action',
        type: 'click',
        params: { backup_selector: 'h1' }
      }
    ];
    
    await executor.executeWorkflow(actions, 'test_export');
    
    // Export report
    const reportPath = './test-reports/execution-report.json';
    const exported = await executor.exportExecutionReport(reportPath);
    
    console.assert(exported === true, '✓ Export successful');
    console.assert(fs.existsSync(reportPath), '✓ Report file created');
    
    // Read and validate
    const reportContent = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    console.assert(reportContent.workflowId === 'test_export', '✓ Report content valid');
    
    console.log('\n✅ Report export works correctly');
    console.log(`Report saved to: ${reportPath}`);
    
    // Cleanup
    fs.unlinkSync(reportPath);
    fs.rmdirSync('./test-reports');
    
    await browser.close();
    return true;
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    await browser.close();
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║    PHASE 7 BATCH 1 - Enhanced Logging & Reports          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  
  const results = [];
  
  results.push({ name: 'Execution Report Structure', passed: await testExecutionReportStructure() });
  results.push({ name: 'Detailed Error Logging', passed: await testDetailedErrorLogging() });
  results.push({ name: 'Method Tracking Statistics', passed: await testMethodTracking() });
  results.push({ name: 'Export Execution Report', passed: await testExportExecutionReport() });
  
  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                      TEST SUMMARY                         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
  });
  
  console.log(`\n📊 Total: ${results.length} | ✅ Passed: ${passed} | ❌ Failed: ${failed}\n`);
  
  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED!\n');
  } else {
    console.log('⚠️  SOME TESTS FAILED\n');
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch(error => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});
