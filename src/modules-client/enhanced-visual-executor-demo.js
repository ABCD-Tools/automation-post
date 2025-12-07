/**
 * Enhanced Visual Executor Demo
 * 
 * This demonstrates the enhanced features:
 * - Detailed error logging with screenshots
 * - Retry logic with relaxed thresholds
 * - Method tracking and statistics
 * 
 * Run with: node src/modules-client/enhanced-visual-executor-demo.js
 */

import { EnhancedVisualExecutor } from './enhanced-visual-executor.js';
import puppeteer from 'puppeteer-core';
import { findChrome } from '../modules-agents/utils/browser.js';

console.log('╔═══════════════════════════════════════════════╗');
console.log('║  ENHANCED VISUAL EXECUTOR DEMO                ║');
console.log('╚═══════════════════════════════════════════════╝\n');

async function main() {
  let browser = null;
  let page = null;

  try {
    // Find Chrome installation
    console.log('🔍 Finding Chrome installation...');
    const chromePath = await findChrome();
    console.log(`✅ Chrome found at: ${chromePath}\n`);

    // Launch browser
    console.log('🚀 Launching browser...');
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: false,
      defaultViewport: {
        width: 1920,
        height: 1080,
      },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
      ],
    });

    page = await browser.newPage();
    console.log('✅ Browser launched\n');

    // Create enhanced executor with configuration
    const executor = new EnhancedVisualExecutor(page, {
      screenshotDir: './demo-screenshots',
      screenshotOnError: true,
      logDetailedErrors: true,
      enableRetry: true,
      maxRetries: 3,
      retryDelay: 1000,
      initialPositionTolerance: 15,
      relaxedPositionTolerance: 30,
      initialSimilarityThreshold: 0.7,
      relaxedSimilarityThreshold: 0.5,
      trackPerformance: true,
      saveDebugScreenshots: false, // Set to true to see debug screenshots
    });

    console.log('✅ Enhanced executor created with configuration:');
    console.log('   - Screenshot on error: enabled');
    console.log('   - Max retries: 3');
    console.log('   - Position tolerance: 15% → 30%');
    console.log('   - Similarity threshold: 70% → 50%');
    console.log('   - Performance tracking: enabled\n');

    // Navigate to test page
    console.log('🌐 Navigating to example.com...');
    await page.goto('https://example.com', { waitUntil: 'networkidle2' });
    console.log('✅ Page loaded\n');

    // Test 1: Successful action
    console.log('═══════════════════════════════════════');
    console.log('TEST 1: Find "More information" link');
    console.log('═══════════════════════════════════════');

    const action1 = {
      type: 'click',
      name: 'Click More Information',
      params: {
        visual: {
          text: 'More information',
          position: {
            absolute: { x: 0, y: 0 }, // Will be found by text
            relative: { x: 50, y: 90 },
          },
        },
      },
    };

    const result1 = await executor.executeAction(action1);
    console.log(`\nResult: ${result1.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Method: ${result1.method}`);
    console.log(`Execution time: ${result1.executionTime}ms`);
    console.log(`Retries: ${result1.retryCount}`);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Go back
    await page.goBack();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Failed action (to demonstrate error logging)
    console.log('\n═══════════════════════════════════════');
    console.log('TEST 2: Try to find non-existent element');
    console.log('═══════════════════════════════════════');

    const action2 = {
      type: 'click',
      name: 'Click Non-Existent Button',
      params: {
        backup_selector: '.this-does-not-exist',
        visual: {
          text: 'This text does not exist on the page',
          position: {
            absolute: { x: 9999, y: 9999 },
            relative: { x: 200, y: 200 }, // Out of bounds
          },
        },
      },
    };

    const result2 = await executor.executeAction(action2);
    console.log(`\nResult: ${result2.success ? '✅ SUCCESS' : '❌ FAILED (as expected)'}`);
    console.log(`Method: ${result2.method}`);
    console.log(`Execution time: ${result2.executionTime}ms`);
    console.log(`Retries: ${result2.retryCount}`);
    console.log(`Error: ${result2.error}`);
    if (result2.errorDetails?.screenshotPath) {
      console.log(`Screenshot saved: ${result2.errorDetails.screenshotPath}`);
    }

    // Test 3: Another successful action
    console.log('\n═══════════════════════════════════════');
    console.log('TEST 3: Find "Example Domain" heading');
    console.log('═══════════════════════════════════════');

    const action3 = {
      type: 'click',
      name: 'Click Example Domain Heading',
      params: {
        visual: {
          text: 'Example Domain',
          position: {
            absolute: { x: 0, y: 0 },
            relative: { x: 50, y: 30 },
          },
        },
      },
    };

    const result3 = await executor.executeAction(action3);
    console.log(`\nResult: ${result3.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Method: ${result3.method}`);
    console.log(`Execution time: ${result3.executionTime}ms`);
    console.log(`Retries: ${result3.retryCount}`);

    // Print comprehensive statistics report
    console.log('\n');
    executor.printStatsReport();

    // Export statistics to JSON
    const statsPath = './demo-screenshots/enhanced-stats.json';
    await executor.exportStats(statsPath);
    console.log(`\n📊 Statistics exported to: ${statsPath}\n`);

    // Show error log
    const errorLog = executor.getErrorLog();
    if (errorLog.length > 0) {
      console.log('📋 Error Log Summary:');
      errorLog.forEach((error, index) => {
        console.log(`\n${index + 1}. ${error.actionName}`);
        console.log(`   Type: ${error.errorType}`);
        console.log(`   Error: ${error.error}`);
        console.log(`   Timestamp: ${error.timestamp}`);
        if (error.screenshotPath) {
          console.log(`   Screenshot: ${error.screenshotPath}`);
        }
        if (error.pageState) {
          console.log(`   Page URL: ${error.pageState.url}`);
          console.log(`   Page Title: ${error.pageState.title}`);
        }
      });
      console.log('');
    }

    console.log('✅ Demo completed successfully!');
    console.log('📁 Check ./demo-screenshots/ for error screenshots and stats\n');

  } catch (error) {
    console.error('\n❌ Demo failed with error:');
    console.error(error);
  } finally {
    // Cleanup
    if (browser) {
      console.log('🔚 Closing browser...');
      await browser.close();
      console.log('✅ Browser closed');
    }
  }
}

// Run the demo
main().catch(console.error);
