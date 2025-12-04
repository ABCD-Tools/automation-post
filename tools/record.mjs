import readline from 'node:readline';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import Jimp from 'jimp';
import { importAlias } from '../src/modules-view/utils/resolve-alias.mjs';

// Import using alias resolver
const { ActionRecorder } = await importAlias('@modules-recorder/index.mjs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

/**
 * Calculate total size of all screenshots in KB
 */
function calculateScreenshotSize(actions) {
  let totalSize = 0;
  
  for (const action of actions) {
    if (action.visual?.screenshot) {
      // Approximate base64 size: (string length * 3) / 4
      const sizeInBytes = (action.visual.screenshot.length * 3) / 4;
      totalSize += sizeInBytes;
    }
    if (action.visual?.contextScreenshot) {
      const sizeInBytes = (action.visual.contextScreenshot.length * 3) / 4;
      totalSize += sizeInBytes;
    }
  }
  
  return Math.round(totalSize / 1024); // Convert to KB
}

/**
 * Get size of single screenshot in KB
 */
function getScreenshotSize(screenshot) {
  if (!screenshot) return 0;
  const sizeInBytes = (screenshot.length * 3) / 4;
  return (sizeInBytes / 1024).toFixed(1);
}

/**
 * Optimize screenshot by compressing and resizing
 * If yes, compress screenshots to 80% quality
 * Resize screenshots to max 400x400 pixels (maintain aspect ratio)
 */
async function optimizeScreenshot(base64Screenshot) {
  try {
    if (!base64Screenshot) return null;
    
    // Remove data URL prefix
    const imageData = base64Screenshot.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(imageData, 'base64');
    
    // Load with Jimp
    const image = await Jimp.read(buffer);
    
    // Resize screenshots to max 400x400 pixels (maintain aspect ratio)
    if (image.bitmap.width > 400 || image.bitmap.height > 400) {
      image.scaleToFit(400, 400);
    }
    
    // Compress to 80% quality
    await image.quality(80);
    
    // Convert back to base64 (PNG format)
    const optimizedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);
    const optimizedBase64 = `data:image/png;base64,${optimizedBuffer.toString('base64')}`;
    
    return optimizedBase64;
  } catch (error) {
    console.warn(`⚠️  Failed to optimize screenshot: ${error.message}`);
    return base64Screenshot; // Return original on error
  }
}

/**
 * Optimize all screenshots in recording
 */
async function optimizeRecording(actions) {
  console.log('\n🔧 Optimizing screenshots...');
  
  let optimizedCount = 0;
  
  for (const action of actions) {
    if (action.visual?.screenshot) {
      process.stdout.write(`\r   Processing: ${optimizedCount + 1}/${actions.length}`);
      action.visual.screenshot = await optimizeScreenshot(action.visual.screenshot);
      optimizedCount++;
    }
    if (action.visual?.contextScreenshot) {
      action.visual.contextScreenshot = await optimizeScreenshot(action.visual.contextScreenshot);
    }
  }
  
  process.stdout.write('\n');
  console.log(`✅ Optimized ${optimizedCount} screenshots\n`);
  
  return actions;
}

async function main() {
  console.log('\n🎬 Micro-Actions Recorder');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Prompt for platform
    const platform = await question('Platform (instagram/facebook/twitter): ');
    if (!['instagram', 'facebook', 'twitter'].includes(platform.toLowerCase())) {
      console.error('❌ Invalid platform. Must be instagram, facebook, or twitter.');
      process.exit(1);
    }

    // Prompt for URL
    const url = await question('Starting URL (e.g., https://instagram.com/accounts/login): ');
    if (!url || !url.startsWith('http')) {
      console.error('❌ Invalid URL. Must start with http:// or https://');
      process.exit(1);
    }

    // Prompt for session name (optional, will use platform_timestamp if not provided)
    let sessionName = await question('Session name (optional, press ENTER for auto-generated): ');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    if (!sessionName.trim()) {
      sessionName = `${platform}_${timestamp}`;
    }

    // Show platform-specific message
    if (platform === 'instagram' || platform === 'facebook') {
      console.log('\n📱 Opening browser in mobile mode for ' + platform + '...');
      console.log('💡 TIP: The page will look like mobile ' + platform);
      console.log('🎬 Recording overlay will show status in top-right corner\n');
    } else {
      console.log('\n🚀 Starting recorder...\n');
    }

    // Create recorder instance
    const recorder = new ActionRecorder();

    // Start recording
    const sessionInfo = await recorder.startRecording(url, platform);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (platform === 'instagram' || platform === 'facebook') {
      console.log('🎬 Browser opened in mobile view');
    } else {
      console.log('🎬 Browser opened');
    }
    console.log('📹 Look for recording indicator in top-right corner');
    console.log('💡 Press F12 if you want to see detailed logs');
    console.log('⏹️  When done, press ENTER here to stop recording.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Periodic status check every 10 seconds
    let lastActionCount = 0;
    let noActionWarningShown = false;
    const statusInterval = setInterval(async () => {
      try {
        const actionCount = await recorder.page.evaluate(() => {
          return window.__recordedActions ? window.__recordedActions.length : 0;
        });
        
        if (actionCount > lastActionCount) {
          console.log(`📊 Captured ${actionCount} actions so far...`);
          lastActionCount = actionCount;
          noActionWarningShown = false;
        } else if (actionCount === 0 && !noActionWarningShown) {
          // Check if we've been recording for at least 30 seconds
          const recordingTime = Date.now() - new Date(sessionInfo.startedAt).getTime();
          if (recordingTime > 30000) {
            console.log('⚠️  No actions captured yet. Is the browser in focus?');
            noActionWarningShown = true;
          }
        }
      } catch (error) {
        // Silently ignore errors (page might be navigating)
      }
    }, 10000); // Every 10 seconds

    // Wait for user to press ENTER
    await question('');

    // Clear status interval
    clearInterval(statusInterval);

    console.log('\n⏹️  Stopping recording...\n');

    // Stop recording
    const recordedActions = await recorder.stopRecording();

    // Calculate initial size
    const initialSize = calculateScreenshotSize(recordedActions);
    
    // Show visual data preview in CLI output
    // For each recorded action, show:
    // - Action type and text
    // - Position (x, y)
    // - Screenshot size in KB
    // - Backup selector (if available)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📸 VISUAL DATA PREVIEW');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    let screenshotCount = 0;
    let actionNum = 1;
    
    for (const action of recordedActions) {
      // Only treat it as a "screenshot" if we actually have image data
      const hasScreenshot =
        !!action.visual?.screenshot || !!action.visual?.contextScreenshot;

      if (action.visual) {
        if (hasScreenshot) {
          screenshotCount++;
        }
        const actionType = action.type.toUpperCase();
        const text = action.visual.text?.substring(0, 40) || action.element?.text?.substring(0, 40) || '';
        const pos = action.visual.position?.absolute || { x: '?', y: '?' };
        const screenshotSize = getScreenshotSize(action.visual.screenshot);
        const selector = action.backup_selector || 'none';
        
        console.log(`[${actionNum}] ${actionType}`);
        console.log(`    Text: "${text}${text.length >= 40 ? '...' : ''}"`);
        console.log(`    Position: (${pos.x}, ${pos.y})`);
        console.log(`    Screenshot: ${screenshotSize} KB`);
        if (selector !== 'none') {
          console.log(`    Backup selector: ${selector.substring(0, 50)}${selector.length > 50 ? '...' : ''}`);
        }
        console.log('');
        actionNum++;
      }
    }
    
    console.log(`📊 Total screenshots: ${screenshotCount}`);
    console.log(`💾 Total size: ${initialSize} KB (${(initialSize / 1024).toFixed(2)} MB)\n`);
    
    // Add warning if total recording size > 5MB (too large)
    if (initialSize > 5120) { // 5MB
      console.log('⚠️  WARNING: Recording size is large (>5MB)');
      console.log('   Large recordings may slow down playback.');
      console.log('   Consider splitting into smaller workflows or optimizing screenshots.');
      // Add tip: "Large recordings may slow down playback. Consider splitting into smaller workflows."
      console.log('💡 TIP: Large recordings may slow down playback. Consider splitting into smaller workflows.\n');
    }
    
    // Add screenshot optimization option
    // Add prompt: "Optimize screenshots? (reduces size, may reduce accuracy)"
    let shouldOptimize = false;
    if (screenshotCount > 0) {
      const optimizeAnswer = await question('🔧 Optimize screenshots? (reduces size, may reduce accuracy) [y/N]: ');
      shouldOptimize = optimizeAnswer.toLowerCase() === 'y' || optimizeAnswer.toLowerCase() === 'yes';
    }
    
    let optimizedActions = recordedActions;
    let finalSize = initialSize;
    
    if (shouldOptimize) {
      // If yes, compress screenshots to 80% quality
      // Resize screenshots to max 400x400 pixels (maintain aspect ratio)
      // Show size before/after optimization
      const startTime = Date.now();
      optimizedActions = await optimizeRecording([...recordedActions]);
      const optimizeTime = ((Date.now() - startTime) / 1000).toFixed(1);
      
      finalSize = calculateScreenshotSize(optimizedActions);
      const reduction = ((initialSize - finalSize) / initialSize * 100).toFixed(1);
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 OPTIMIZATION RESULTS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`   Before: ${initialSize} KB`);
      console.log(`   After:  ${finalSize} KB`);
      console.log(`   Saved:  ${initialSize - finalSize} KB (${reduction}% reduction)`);
      console.log(`   Time:   ${optimizeTime}s`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    // Convert to micro-actions
    console.log('🔄 Converting to micro-actions format...\n');
    const microActions = recorder.convertToMicroActions(optimizedActions);

    // Calculate duration (from first to last action)
    const duration = recordedActions.length > 0 
      ? recordedActions[recordedActions.length - 1].timestamp - recordedActions[0].timestamp
      : 0;

    // Prepare recording data with visual metadata
    // File structure:
    // {
    //   sessionId: string,
    //   platform: string,
    //   url: string,
    //   timestamp: string,
    //   recordedActions: [], // Raw events with full visual data
    //   microActions: [],    // Converted format
    //   metadata: {
    //     duration: number,
    //     totalActions: number,
    //     totalScreenshotSize: number // In KB
    //   }
    // }
    const recordingData = {
      sessionId: uuidv4(),
      platform: platform.toLowerCase(),
      url,
      timestamp: new Date().toISOString(),
      recordedActions: optimizedActions, // Raw events with full visual data
      microActions: microActions.map((action, index) => {
        // Handle both formats: new format (visual/backup_selector at top) and old format (in params)
        if (action.visual) {
          // New format - visual and backup_selector at top level
          return {
            name: action.name || `${action.type}_${index + 1}`,
            type: action.type,
            visual: action.visual,
            backup_selector: action.backup_selector || null,
            execution_method: action.execution_method || 'visual_first',
            ...(action.type === 'type' ? { text: action.text || '' } : {}),
          };
        } else {
          // Old format - in params
          return {
            name: action.name || `${action.type}_${index + 1}`,
            type: action.type,
            params: action.params || {},
          };
        }
      }),
      metadata: {
        duration: duration,
        totalActions: recordedActions.length,
        totalScreenshotSize: finalSize, // In KB
      }
    };

    // Save to recordings folder
    // Create recordings/ directory if it doesn't exist
    const recordingsDir = join(process.cwd(), 'recordings');
    try {
      mkdirSync(recordingsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Save file as: recordings/{platform}_{timestamp}.json
    const filename = `${platform}_${timestamp}.json`;
    const filepath = join(recordingsDir, filename);
    writeFileSync(filepath, JSON.stringify(recordingData, null, 2));

    // Show summary with visual data stats (number of screenshots, total size)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ RECORDING COMPLETED SUCCESSFULLY!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 RECORDING SUMMARY:');
    console.log(`   • Actions recorded: ${recordedActions.length}`);
    console.log(`   • Micro-actions generated: ${microActions.length}`);
    console.log(`   • Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`   • Platform: ${platform}`);
    console.log(`   • Session: ${sessionName}\n`);
    console.log('📸 VISUAL DATA STATS:');
    console.log(`   • Number of screenshots: ${screenshotCount}`);
    console.log(`   • Total size: ${finalSize} KB (${(finalSize / 1024).toFixed(2)} MB)`);
    console.log(`   • Optimized: ${shouldOptimize ? 'Yes' : 'No'}`);
    if (shouldOptimize) {
      const reduction = ((initialSize - finalSize) / initialSize * 100).toFixed(1);
      console.log(`   • Size reduction: ${reduction}%`);
    }
    console.log(`\n💾 FILE SAVED:`);
    console.log(`   ${filepath}\n`);
    console.log('📋 NEXT STEPS:');
    console.log('   1. Go to admin UI: http://localhost:3000/admin/micro-actions');
    console.log('   2. Click "Import Recording"');
    console.log('   3. Select the JSON file from recordings/ folder');
    console.log('   4. Review and import the micro-actions\n');
    console.log('💡 TIP:');
    if (finalSize > 5120) {
      console.log('   Large recordings may slow down playback.');
      console.log('   Consider splitting into smaller workflows.\n');
    } else {
      console.log('   Your recording size is optimal for fast playback.\n');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();

