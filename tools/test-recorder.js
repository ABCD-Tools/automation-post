import { ActionRecorder } from '../src/modules-recorder/index.mjs';

/**
 * Test recorder on a simple page (not Instagram)
 * This helps verify the recorder works before testing on complex sites
 */
async function testRecorder() {
  console.log('\n🧪 Testing Recorder on Simple Page');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const recorder = new ActionRecorder();
  
  try {
    // Test on a simple page (no CSP, no React, no SPA)
    const testUrl = 'https://httpbingo.org/forms/post';
    console.log(`🌐 Testing on: ${testUrl}`);
    console.log('   (This page has a simple form - no CSP, no React)\n');

    // Start recording
    const sessionInfo = await recorder.startRecording(testUrl, 'test');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 Instructions:');
    console.log('   1. Click in the "custname" input field');
    console.log('   2. Type some text (e.g., "testuser")');
    console.log('   3. Click in the "custtel" input field');
    console.log('   4. Type some text (e.g., "1234567890")');
    console.log('   5. Click the submit button');
    console.log('   6. Press ENTER here to stop recording');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 Watch the DevTools console for:');
    console.log('   🎯 Recorded click: ...');
    console.log('   ⌨️ Recorded type: ...\n');

    // Live action count display
    async function showLiveCount(recorder) {
      const interval = setInterval(async () => {
        try {
          if (recorder.page && !recorder.page.isClosed()) {
            const count = await recorder.page.evaluate(() => {
              return window.__recordedActions ? window.__recordedActions.length : 0;
            });
            process.stdout.write(`\r📊 Actions captured so far: ${count}   `);
          }
        } catch (e) {
          // Page might be closed or navigating
        }
      }, 2000); // Every 2 seconds
      
      return interval;
    }

    // Wait for user input
    const readline = await import('node:readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const question = (prompt) => {
      return new Promise((resolve) => {
        rl.question(prompt, resolve);
      });
    };

    // Start live count display
    const countInterval = await showLiveCount(recorder);
    
    await question('Press ENTER when done...\n');
    
    // Clear live count interval
    clearInterval(countInterval);
    process.stdout.write('\n'); // New line after live count

    rl.close();

    // Show action preview before stopping
    console.log('\n📋 Actions captured:');
    try {
      const preview = await recorder.page.evaluate(() => {
        if (!window.__recordedActions) return [];
        return window.__recordedActions.slice(0, 5).map((action, i) => {
          const text = action.visual?.text || action.backup_selector || action.selector || 'unknown';
          return `   ${i + 1}. ${action.type}: ${text.substring(0, 40)}`;
        });
      });
      preview.forEach(line => console.log(line));
      if (preview.length === 0) {
        console.log('   (No actions preview available)');
      }
    } catch (error) {
      console.log('   (Could not preview actions)');
    }

    // Stop recording
    console.log('\n⏹️  Stopping recording...\n');
    const recordedActions = await recorder.stopRecording();

    // Show results
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 TEST RESULTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`✅ Total actions captured: ${recordedActions.length}\n`);

    if (recordedActions.length === 0) {
      console.log('❌ TEST FAILED: No actions were captured!');
      console.log('   This indicates the recorder script is not working properly.\n');
      process.exit(1);
    }

    // Show action breakdown
    const actionTypes = {};
    recordedActions.forEach(action => {
      actionTypes[action.type] = (actionTypes[action.type] || 0) + 1;
    });

    console.log('📋 Action Breakdown:');
    Object.entries(actionTypes).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    console.log('');

    // Check for screenshots
    const withScreenshots = recordedActions.filter(a => a.visual?.screenshot).length;
    console.log(`📸 Actions with screenshots: ${withScreenshots}/${recordedActions.length}\n`);

    if (withScreenshots === 0 && recordedActions.length > 0) {
      console.log('⚠️  WARNING: Actions captured but no screenshots!');
      console.log('   This might indicate html2canvas is blocked or not loaded.\n');
    }

    console.log('✅ TEST PASSED: Recorder is working!\n');
    console.log('💡 If this test passes but Instagram recording fails,');
    console.log('   the issue is likely Instagram-specific (CSP, React, etc.)\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testRecorder();

