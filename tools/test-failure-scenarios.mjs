import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';
import { findChrome } from '@modules-agents/utils/browser.js';
import { importAlias } from '../src/modules-view/utils/resolve-alias.mjs';

/**
 * Test Failure Scenarios
 * 
 * Tests how the visual executor handles various failure scenarios:
 * 1. Element moved to different position - should find by visual search
 * 2. Element text changed - should find by position + image similarity
 * 3. Complete UI redesign - should fail gracefully with helpful error
 * 4. Element removed - should fail with clear message
 * 
 * Verifies error messages are actionable
 */

const { VisualActionExecutor } = await importAlias('@modules-client/visual-executor.js');

async function testElementMoved(testRecordingPath) {
  console.log('\n🧪 TEST: Element Moved to Different Position');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const testRecording = JSON.parse(readFileSync(testRecordingPath, 'utf-8'));
  const action = testRecording.microActions.find((a) => a.type === 'click');

  if (!action) {
    console.log('⚠️  No click action found in recording');
    return { success: false, error: 'No click action found' };
  }

  // Modify position to simulate element moved
  const modifiedAction = {
    ...action,
    visual: {
      ...action.visual,
      position: {
        absolute: {
          x: action.visual.position.absolute.x + 200, // Moved 200px right
          y: action.visual.position.absolute.y + 100, // Moved 100px down
        },
        relative: {
          x: action.visual.position.relative.x + 15, // Moved 15% right
          y: action.visual.position.relative.y + 10, // Moved 10% down
        },
      },
    },
  };

  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  try {
    await page.goto(testRecording.url, { waitUntil: 'networkidle2' });
    const executor = new VisualActionExecutor(page);

    console.log('📝 Original position:', action.visual.position.absolute);
    console.log('📝 Modified position:', modifiedAction.visual.position.absolute);
    console.log('🔍 Testing visual search with moved element...\n');

    const result = await executor.executeAction(modifiedAction);

    if (result.success) {
      console.log('✅ SUCCESS: Found element by visual search despite position change');
      console.log(`   Method used: ${result.method}\n`);
      return { success: true, method: result.method };
    } else {
      console.log('❌ FAILED: Could not find moved element');
      console.log(`   Error: ${result.error}\n`);
      return { success: false, error: result.error };
    }
  } finally {
    await browser.close();
  }
}

async function testElementTextChanged(testRecordingPath) {
  console.log('\n🧪 TEST: Element Text Changed');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const testRecording = JSON.parse(readFileSync(testRecordingPath, 'utf-8'));
  const action = testRecording.microActions.find((a) => a.type === 'click' && a.visual?.text);

  if (!action) {
    console.log('⚠️  No click action with text found in recording');
    return { success: false, error: 'No click action with text found' };
  }

  // Modify text to simulate UI change
  const modifiedAction = {
    ...action,
    visual: {
      ...action.visual,
      text: 'DIFFERENT TEXT', // Changed text
    },
  };

  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  try {
    await page.goto(testRecording.url, { waitUntil: 'networkidle2' });
    const executor = new VisualActionExecutor(page);

    console.log('📝 Original text:', action.visual.text);
    console.log('📝 Modified text:', modifiedAction.visual.text);
    console.log('🔍 Testing with position + image similarity...\n');

    const result = await executor.executeAction(modifiedAction);

    if (result.success) {
      console.log('✅ SUCCESS: Found element by position + image similarity');
      console.log(`   Method used: ${result.method}\n`);
      return { success: true, method: result.method };
    } else {
      console.log('❌ FAILED: Could not find element with changed text');
      console.log(`   Error: ${result.error}\n`);
      return { success: false, error: result.error };
    }
  } finally {
    await browser.close();
  }
}

async function testCompleteUIRedesign(testRecordingPath) {
  console.log('\n🧪 TEST: Complete UI Redesign');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const testRecording = JSON.parse(readFileSync(testRecordingPath, 'utf-8'));
  const action = testRecording.microActions[0];

  // Completely modify action to simulate redesign
  const modifiedAction = {
    ...action,
    visual: {
      ...action.visual,
      screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANS...', // Different screenshot
      text: 'COMPLETELY DIFFERENT',
      position: {
        absolute: { x: 9999, y: 9999 }, // Way off screen
        relative: { x: 99, y: 99 },
      },
    },
    backup_selector: 'nonexistent-selector-12345', // Invalid selector
  };

  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  try {
    await page.goto(testRecording.url, { waitUntil: 'networkidle2' });
    const executor = new VisualActionExecutor(page);

    console.log('🔍 Testing with completely redesigned UI...\n');

    const result = await executor.executeAction(modifiedAction);

    if (!result.success) {
      // Check if error message is helpful
      const errorMessage = result.error || 'Unknown error';
      const isActionable = errorMessage.includes('not found') ||
                          errorMessage.includes('element') ||
                          errorMessage.includes('selector') ||
                          errorMessage.includes('visual');

      console.log('✅ FAILED GRACEFULLY (expected)');
      console.log(`   Error: ${errorMessage}`);
      console.log(`   Error is actionable: ${isActionable ? '✅' : '❌'}\n`);

      if (isActionable) {
        console.log('💡 SUGGESTED ACTIONS:');
        console.log('   1. Re-record the workflow on the new UI');
        console.log('   2. Check if element still exists on the page');
        console.log('   3. Verify the page URL is correct\n');
      }

      return { success: true, errorMessage, isActionable };
    } else {
      console.log('⚠️  UNEXPECTED: Found element despite complete redesign');
      return { success: false, error: 'Should have failed but succeeded' };
    }
  } finally {
    await browser.close();
  }
}

async function testElementRemoved(testRecordingPath) {
  console.log('\n🧪 TEST: Element Removed from Page');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const testRecording = JSON.parse(readFileSync(testRecordingPath, 'utf-8'));
  const action = testRecording.microActions.find((a) => a.type === 'click');

  if (!action) {
    console.log('⚠️  No click action found in recording');
    return { success: false, error: 'No click action found' };
  }

  // Navigate to a different page where element doesn't exist
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  try {
    // Navigate to a page where the element doesn't exist
    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });
    const executor = new VisualActionExecutor(page);

    console.log('🔍 Testing with element removed from page...\n');

    const result = await executor.executeAction(action);

    if (!result.success) {
      const errorMessage = result.error || 'Unknown error';
      const isClear = errorMessage.includes('not found') ||
                     errorMessage.includes('element') ||
                     errorMessage.length > 10; // Not just "failed"

      console.log('✅ FAILED WITH CLEAR MESSAGE (expected)');
      console.log(`   Error: ${errorMessage}`);
      console.log(`   Message is clear: ${isClear ? '✅' : '❌'}\n`);

      if (isClear) {
        console.log('💡 SUGGESTED ACTIONS:');
        console.log('   1. Verify the element exists on the current page');
        console.log('   2. Check if the page structure has changed');
        console.log('   3. Re-record the action if element was removed\n');
      }

      return { success: true, errorMessage, isClear };
    } else {
      console.log('⚠️  UNEXPECTED: Found element that should not exist');
      return { success: false, error: 'Should have failed but succeeded' };
    }
  } finally {
    await browser.close();
  }
}

async function runAllFailureTests(testRecordingPath) {
  console.log('\n🧪 FAILURE SCENARIO TEST SUITE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const results = {};

  // Test 1: Element moved
  try {
    results.elementMoved = await testElementMoved(testRecordingPath);
  } catch (error) {
    results.elementMoved = { success: false, error: error.message };
  }

  // Test 2: Element text changed
  try {
    results.elementTextChanged = await testElementTextChanged(testRecordingPath);
  } catch (error) {
    results.elementTextChanged = { success: false, error: error.message };
  }

  // Test 3: Complete UI redesign
  try {
    results.completeUIRedesign = await testCompleteUIRedesign(testRecordingPath);
  } catch (error) {
    results.completeUIRedesign = { success: false, error: error.message };
  }

  // Test 4: Element removed
  try {
    results.elementRemoved = await testElementRemoved(testRecordingPath);
  } catch (error) {
    results.elementRemoved = { success: false, error: error.message };
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 FAILURE SCENARIO TEST SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('1. Element Moved:');
  console.log(`   ${results.elementMoved.success ? '✅' : '❌'} ${results.elementMoved.method || results.elementMoved.error || 'N/A'}\n`);

  console.log('2. Element Text Changed:');
  console.log(`   ${results.elementTextChanged.success ? '✅' : '❌'} ${results.elementTextChanged.method || results.elementTextChanged.error || 'N/A'}\n`);

  console.log('3. Complete UI Redesign:');
  console.log(`   ${results.completeUIRedesign.success ? '✅' : '❌'} ${results.completeUIRedesign.isActionable ? 'Actionable error' : results.completeUIRedesign.error || 'N/A'}\n`);

  console.log('4. Element Removed:');
  console.log(`   ${results.elementRemoved.success ? '✅' : '❌'} ${results.elementRemoved.isClear ? 'Clear error' : results.elementRemoved.error || 'N/A'}\n`);

  return results;
}

// CLI usage
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.endsWith('test-failure-scenarios.mjs');

if (isMainModule) {
  const testFile = process.argv[2] || join(process.cwd(), 'recordings', 'test_instagram_login_*.json');

  runAllFailureTests(testFile)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { testElementMoved, testElementTextChanged, testCompleteUIRedesign, testElementRemoved, runAllFailureTests };

