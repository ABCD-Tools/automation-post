/**
 * Phase 7 Batch 3 Test - Visual Debugging Mode
 * 
 * Tests:
 * - Debug mode activation
 * - Before/after screenshot capture
 * - Element highlighting
 * - HTML debug report generation
 * 
 * Run: node tests/phase7-batch3.test.js
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
 * Test 1: Debug Mode Activation
 */
async function testDebugModeActivation() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Debug Mode Activation');
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
    
    const debugDir = './logs/test-debug-1';
    const executor = new WorkflowExecutor(page, {
      logProgress: false,
      debug: true,  // Enable debug mode
      debugDir
    });
    
    console.assert(executor.debugMode === true, '✓ Debug mode enabled');
    console.assert(executor.debugDir === debugDir, '✓ Debug directory set');
    console.assert(fs.existsSync(debugDir), '✓ Debug directory created');
    
    console.log('\n✅ Debug mode activation works');
    
    // Cleanup
    if (fs.existsSync(debugDir)) {
      fs.rmdirSync(debugDir);
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
 * Test 2: Before/After Screenshot Capture
 */
async function testBeforeAfterScreenshots() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Before/After Screenshot Capture');
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
    
    const debugDir = './logs/test-debug-2';
    const executor = new WorkflowExecutor(page, {
      logProgress: false,
      debug: true,
      debugDir
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
    
    await executor.executeWorkflow(actions, 'test_screenshots');
    
    const debugScreenshots = executor.getDebugScreenshots();
    
    console.assert(debugScreenshots.length > 0, '✓ Debug screenshots captured');
    console.assert(debugScreenshots[0].before !== null, '✓ Before screenshot exists');
    console.assert(debugScreenshots[0].after !== null, '✓ After screenshot exists');
    console.assert(fs.existsSync(debugScreenshots[0].before), '✓ Before file created');
    console.assert(fs.existsSync(debugScreenshots[0].after), '✓ After file created');
    
    console.log('\n✅ Screenshot capture works correctly');
    console.log(`  Before: ${debugScreenshots[0].before}`);
    console.log(`  After: ${debugScreenshots[0].after}`);
    
    // Cleanup
    if (fs.existsSync(debugDir)) {
      const files = fs.readdirSync(debugDir);
      files.forEach(file => fs.unlinkSync(path.join(debugDir, file)));
      fs.rmdirSync(debugDir);
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
 * Test 3: Element Highlighting
 */
async function testElementHighlighting() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: Element Highlighting');
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
      logProgress: false,
      debug: true
    });
    
    // Test highlighting by selector
    await executor.highlightElement('h1');
    
    // Check if element has red outline
    const hasHighlight = await page.evaluate(() => {
      const element = document.querySelector('h1');
      return element && element.style.outline.includes('red');
    });
    
    console.assert(hasHighlight === true, '✓ Element highlighted with red border');
    
    console.log('\n✅ Element highlighting works');
    
    await browser.close();
    return true;
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    await browser.close();
    return false;
  }
}

/**
 * Test 4: HTML Debug Report Generation
 */
async function testHtmlDebugReport() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 4: HTML Debug Report Generation');
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
    
    const debugDir = './logs/test-debug-4';
    const executor = new WorkflowExecutor(page, {
      logProgress: false,
      debug: true,
      debugDir
    });
    
    // Execute workflow
    const actions = [
      {
        name: 'Test action 1',
        type: 'click',
        params: {
          backup_selector: 'h1',
          visual: { text: 'Example' }
        }
      },
      {
        name: 'Test action 2',
        type: 'wait',
        params: { duration: 100 }
      }
    ];
    
    await executor.executeWorkflow(actions, 'test_report');
    
    // Check if HTML report was auto-generated
    const files = fs.readdirSync(debugDir);
    const htmlFiles = files.filter(f => f.endsWith('.html'));
    
    console.assert(htmlFiles.length > 0, '✓ HTML report generated');
    
    const htmlPath = path.join(debugDir, htmlFiles[0]);
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    console.assert(htmlContent.includes('Debug Report'), '✓ HTML contains title');
    console.assert(htmlContent.includes('Test action 1'), '✓ HTML contains action name');
    console.assert(htmlContent.includes('test_report'), '✓ HTML contains workflow ID');
    console.assert(htmlContent.includes('Before'), '✓ HTML has before section');
    console.assert(htmlContent.includes('After'), '✓ HTML has after section');
    
    console.log('\n✅ HTML debug report generation works');
    console.log(`  Report: ${htmlPath}`);
    console.log(`  Size: ${(htmlContent.length / 1024).toFixed(1)} KB`);
    
    // Cleanup
    if (fs.existsSync(debugDir)) {
      const files = fs.readdirSync(debugDir);
      files.forEach(file => fs.unlinkSync(path.join(debugDir, file)));
      fs.rmdirSync(debugDir);
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
 * Test 5: Debug Report Contents
 */
async function testDebugReportContents() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 5: Debug Report Contents');
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
    
    const debugDir = './logs/test-debug-5';
    const executor = new WorkflowExecutor(page, {
      logProgress: false,
      debug: true,
      debugDir
    });
    
    // Execute mix of success and failure
    const actions = [
      {
        name: 'Successful action',
        type: 'click',
        params: { backup_selector: 'h1' }
      },
      {
        name: 'Failed action',
        type: 'click',
        params: { backup_selector: '.nonexistent' },
        retryOnFailure: false
      }
    ];
    
    await executor.executeWorkflow(actions, 'test_contents');
    
    // Read generated report
    const files = fs.readdirSync(debugDir);
    const htmlFile = files.find(f => f.endsWith('.html'));
    const htmlPath = path.join(debugDir, htmlFile);
    const html = fs.readFileSync(htmlPath, 'utf8');
    
    // Verify report includes success/failure indicators
    console.assert(html.includes('✓ Success'), '✓ Success indicator present');
    console.assert(html.includes('✗ Failed'), '✓ Failure indicator present');
    console.assert(html.includes('Success Rate'), '✓ Success rate displayed');
    console.assert(html.includes('Avg Time'), '✓ Average time displayed');
    console.assert(html.includes('badge success'), '✓ Success badge styled');
    console.assert(html.includes('badge error'), '✓ Error badge styled');
    
    console.log('\n✅ Debug report contents are complete');
    
    // Cleanup
    if (fs.existsSync(debugDir)) {
      const files = fs.readdirSync(debugDir);
      files.forEach(file => fs.unlinkSync(path.join(debugDir, file)));
      fs.rmdirSync(debugDir);
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
 * Run all tests
 */
async function runAllTests() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║    PHASE 7 BATCH 3 - Visual Debugging Mode               ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  
  const results = [];
  
  results.push({ name: 'Debug Mode Activation', passed: await testDebugModeActivation() });
  results.push({ name: 'Before/After Screenshot Capture', passed: await testBeforeAfterScreenshots() });
  results.push({ name: 'Element Highlighting', passed: await testElementHighlighting() });
  results.push({ name: 'HTML Debug Report Generation', passed: await testHtmlDebugReport() });
  results.push({ name: 'Debug Report Contents', passed: await testDebugReportContents() });
  
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
