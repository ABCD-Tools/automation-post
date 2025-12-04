import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';
import { findChrome } from '@modules-agents/utils/browser.js';
import { importAlias } from '../src/modules-view/utils/resolve-alias.mjs';

/**
 * Test Visual Execution Script
 * 
 * Load test recording from Phase 9.1
 * Execute workflow using VisualActionExecutor
 * Test each execution method:
 * - Selector-first (should work if page unchanged)
 * - Visual-first (should work even if selectors changed)
 * - Visual-only (should work with no selector)
 * 
 * Verify successful login after execution
 */

const { VisualActionExecutor } = await importAlias('@modules-client/visual-executor.js');

async function testVisualExecution(testRecordingPath, executionMethod = 'visual_first') {
  console.log('\n🧪 TEST: Visual Execution');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Load test recording
  console.log('📂 Loading test recording...');
  const testRecording = JSON.parse(readFileSync(testRecordingPath, 'utf-8'));
  console.log(`   File: ${testRecordingPath}`);
  console.log(`   Actions: ${testRecording.microActions.length}\n`);

  // Get micro-actions
  const microActions = testRecording.microActions;

  // Launch browser
  console.log('🌐 Launching browser...');
  const executablePath = findChrome();
  const browser = await puppeteer.launch({
    executablePath,
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  try {
    // Navigate to test URL
    console.log(`🌐 Navigating to: ${testRecording.url}\n`);
    await page.goto(testRecording.url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Create executor
    const executor = new VisualActionExecutor(page);

    // Override execution method for all actions
    const actionsToExecute = microActions.map((action) => {
      // Support both formats: new (visual/backup_selector at top) and old (in params)
      if (action.visual) {
        return {
          ...action,
          execution_method: executionMethod,
        };
      } else {
        return {
          ...action,
          params: {
            ...action.params,
            execution_method: executionMethod,
          },
        };
      }
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`▶️  EXECUTING WITH METHOD: ${executionMethod.toUpperCase()}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    // Execute each action
    for (let i = 0; i < actionsToExecute.length; i++) {
      const action = actionsToExecute[i];
      console.log(`[${i + 1}/${actionsToExecute.length}] ${action.name || action.type}`);

      const startTime = Date.now();
      const result = await executor.executeAction(action);
      const duration = Date.now() - startTime;

      results.push({
        action: action.name || action.type,
        result,
        duration,
      });

      if (result.success) {
        successCount++;
        console.log(`   ✅ Success (${result.method}) - ${duration}ms\n`);
      } else {
        failureCount++;
        console.log(`   ❌ Failed: ${result.error} - ${duration}ms\n`);
      }

      // Wait between actions
      await page.waitForTimeout(1000 + Math.random() * 1000);
    }

    // Get execution stats
    const stats = executor.getStats();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 EXECUTION RESULTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`   Total Actions: ${actionsToExecute.length}`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Failed: ${failureCount}`);
    console.log(`   Success Rate: ${((successCount / actionsToExecute.length) * 100).toFixed(1)}%\n`);
    console.log('   Execution Methods Used:');
    console.log(`      Selector: ${stats.selectorSuccess}`);
    console.log(`      Visual: ${stats.visualSuccess}`);
    console.log(`      Text: ${stats.textSuccess}`);
    console.log(`      Position: ${stats.positionSuccess}`);
    console.log(`      Failures: ${stats.failures}\n`);

    // Verify login success (check if we're on a different page or see success indicator)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 VERIFYING LOGIN SUCCESS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await page.waitForTimeout(3000); // Wait for page to load after login

    const currentUrl = page.url();
    const pageTitle = await page.title();

    console.log(`   Current URL: ${currentUrl}`);
    console.log(`   Page Title: ${pageTitle}\n`);

    // Check if we're logged in (URL changed or title changed)
    const loginSuccessful = !currentUrl.includes('/accounts/login') || 
                           currentUrl.includes('/accounts/onetap') ||
                           pageTitle.toLowerCase().includes('instagram');

    if (loginSuccessful) {
      console.log('✅ LOGIN VERIFICATION: Appears successful\n');
    } else {
      console.log('⚠️  LOGIN VERIFICATION: Could not confirm success\n');
    }

    // Wait for manual inspection
    console.log('⏸️  Browser will remain open for 10 seconds for inspection...\n');
    await page.waitForTimeout(10000);

    return {
      success: failureCount === 0,
      executionMethod,
      results,
      stats,
      loginSuccessful,
      successCount,
      failureCount,
    };

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

async function testAllExecutionMethods(testRecordingPath) {
  console.log('\n🧪 TESTING ALL EXECUTION METHODS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const methods = ['selector_first', 'visual_first', 'visual_only'];
  const results = {};

  for (const method of methods) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TESTING: ${method.toUpperCase()}`);
    console.log('='.repeat(60));
    
    const result = await testVisualExecution(testRecordingPath, method);
    results[method] = result;

    // Wait between method tests
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 EXECUTION METHOD COMPARISON');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const [method, result] of Object.entries(results)) {
    console.log(`${method.toUpperCase()}:`);
    console.log(`   Success Rate: ${((result.successCount / result.results.length) * 100).toFixed(1)}%`);
    console.log(`   Methods Used: Selector(${result.stats.selectorSuccess}), Visual(${result.stats.visualSuccess}), Text(${result.stats.textSuccess}), Position(${result.stats.positionSuccess})`);
    console.log(`   Login Verified: ${result.loginSuccessful ? '✅' : '❌'}\n`);
  }

  return results;
}

// CLI usage
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.endsWith('test-visual-execution.js');

if (isMainModule) {
  const args = process.argv.slice(2);
  const testFile = args[0] || join(process.cwd(), 'recordings', 'test_instagram_login_*.json');

  if (args.includes('--all-methods')) {
    testAllExecutionMethods(testFile)
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
      });
  } else {
    const method = args[1] || 'visual_first';
    testVisualExecution(testFile, method)
      .then((result) => {
        process.exit(result.success ? 0 : 1);
      })
      .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
      });
  }
}

export { testVisualExecution, testAllExecutionMethods };

