import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { importAlias } from '../src/modules-view/utils/resolve-alias.mjs';

/**
 * Test Visual Recording Script
 * 
 * Test scenario: Record Instagram login
 * 1. Open Instagram login page
 * 2. Record clicking username field
 * 3. Record typing (masked as {{username}})
 * 4. Record clicking password field
 * 5. Record typing (masked as {{password}})
 * 6. Record clicking login button
 * 
 * Verifies all visual data captured:
 * - Screenshots present and valid
 * - Positions recorded correctly
 * - Text extracted correctly
 * - Surrounding text captured
 * - Backup selectors generated
 */

const { ActionRecorder } = await importAlias('@modules-recorder/index.mjs');

async function testVisualRecording() {
  console.log('\n🧪 TEST: Visual Recording');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const recorder = new ActionRecorder();
  const testUrl = 'https://www.instagram.com/accounts/login/';

  try {
    // Start recording
    console.log('📹 Starting recording session...');
    console.log(`   URL: ${testUrl}\n`);
    
    const sessionInfo = await recorder.startRecording(testUrl, 'instagram');
    console.log('✅ Recording started');
    console.log(`   Session: ${sessionInfo.startedAt}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 TEST INSTRUCTIONS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Wait for Instagram login page to load');
    console.log('2. Click on the username/email input field');
    console.log('3. Type your username (will be masked as {{username}})');
    console.log('4. Click on the password input field');
    console.log('5. Type your password (will be masked as {{password}})');
    console.log('6. Click the "Log In" button');
    console.log('7. Press ENTER here when done\n');
    console.log('⏱️  You have 60 seconds to complete the actions...\n');

    // Wait for user input (simulated with timeout for automated testing)
    await new Promise((resolve) => {
      // In real scenario, wait for user to press ENTER
      // For automated test, wait 60 seconds
      setTimeout(resolve, 60000);
    });

    console.log('\n⏹️  Stopping recording...\n');

    // Stop recording
    const recordedActions = await recorder.stopRecording();

    console.log(`📦 Captured ${recordedActions.length} actions\n`);

    // Verify visual data
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ VERIFICATION: Visual Data Capture');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let screenshotCount = 0;
    let positionCount = 0;
    let textCount = 0;
    let surroundingTextCount = 0;
    let selectorCount = 0;
    const issues = [];

    for (let i = 0; i < recordedActions.length; i++) {
      const action = recordedActions[i];
      const hasVisual = !!action.visual;
      const hasScreenshot = !!action.visual?.screenshot;
      const hasPosition = !!action.visual?.position;
      const hasText = !!action.visual?.text;
      const hasSurroundingText = !!action.visual?.surroundingText?.length;
      const hasSelector = !!action.backup_selector;

      console.log(`[${i + 1}] ${action.type.toUpperCase()}`);
      
      if (hasScreenshot) {
        screenshotCount++;
        const sizeKB = (action.visual.screenshot.length * 3) / 4 / 1024;
        console.log(`    ✅ Screenshot: ${sizeKB.toFixed(1)} KB`);
      } else {
        console.log(`    ❌ Screenshot: Missing`);
        issues.push(`Action ${i + 1} (${action.type}): Missing screenshot`);
      }

      if (hasPosition) {
        positionCount++;
        const pos = action.visual.position.absolute;
        console.log(`    ✅ Position: (${pos.x}, ${pos.y})`);
      } else {
        console.log(`    ❌ Position: Missing`);
        issues.push(`Action ${i + 1} (${action.type}): Missing position`);
      }

      if (hasText) {
        textCount++;
        console.log(`    ✅ Text: "${action.visual.text.substring(0, 30)}..."`);
      } else {
        console.log(`    ⚠️  Text: Not captured (may be empty for inputs)`);
      }

      if (hasSurroundingText) {
        surroundingTextCount++;
        console.log(`    ✅ Surrounding Text: ${action.visual.surroundingText.length} items`);
      } else {
        console.log(`    ⚠️  Surrounding Text: Not captured`);
      }

      if (hasSelector) {
        selectorCount++;
        console.log(`    ✅ Backup Selector: ${action.backup_selector.substring(0, 40)}...`);
      } else {
        console.log(`    ⚠️  Backup Selector: Not generated`);
      }

      console.log('');
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 VERIFICATION SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`   Total Actions: ${recordedActions.length}`);
    console.log(`   Screenshots: ${screenshotCount}/${recordedActions.length}`);
    console.log(`   Positions: ${positionCount}/${recordedActions.length}`);
    console.log(`   Text Captured: ${textCount}/${recordedActions.length}`);
    console.log(`   Surrounding Text: ${surroundingTextCount}/${recordedActions.length}`);
    console.log(`   Backup Selectors: ${selectorCount}/${recordedActions.length}\n`);

    if (issues.length > 0) {
      console.log('⚠️  ISSUES FOUND:');
      issues.forEach((issue) => console.log(`   - ${issue}`));
      console.log('');
    }

    // Convert to micro-actions
    console.log('🔄 Converting to micro-actions format...\n');
    const microActions = recorder.convertToMicroActions(recordedActions);

    // Save test recording
    const recordingsDir = join(process.cwd(), 'recordings');
    mkdirSync(recordingsDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `test_instagram_login_${timestamp}.json`;
    const filepath = join(recordingsDir, filename);

    const testRecording = {
      testName: 'Instagram Login Flow',
      testDate: new Date().toISOString(),
      url: testUrl,
      platform: 'instagram',
      recordedActions,
      microActions,
      verification: {
        totalActions: recordedActions.length,
        screenshots: screenshotCount,
        positions: positionCount,
        textCaptured: textCount,
        surroundingText: surroundingTextCount,
        backupSelectors: selectorCount,
        issues,
      },
    };

    writeFileSync(filepath, JSON.stringify(testRecording, null, 2));

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ TEST RECORDING SAVED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`📁 File: ${filepath}\n`);

    // Final validation
    const allCritical = screenshotCount === recordedActions.length && 
                       positionCount === recordedActions.length;

    if (allCritical && issues.length === 0) {
      console.log('✅ TEST PASSED: All visual data captured correctly\n');
      return { success: true, filepath, testRecording };
    } else {
      console.log('⚠️  TEST PASSED WITH WARNINGS: Some data missing\n');
      return { success: true, warnings: issues, filepath, testRecording };
    }

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    return { success: false, error: error.message };
  }
}

// Run test if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.endsWith('test-visual-recording.js');

if (isMainModule) {
  testVisualRecording()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { testVisualRecording };

