#!/usr/bin/env node

/**
 * Process Recordings Screenshots
 * 
 * This script processes existing recording files to extract and save screenshots to local files.
 * It updates the recording files to reference local screenshot files instead of base64 data.
 * 
 * Usage:
 *   node tools/process-recordings-screenshots.mjs [recording-file]
 * 
 * If no file is specified, processes all recordings in the recordings/ directory.
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { importAlias } from '../src/modules-view/utils/resolve-alias.mjs';

// Import using alias resolver
const { saveFilesFromRecordingFile } = await importAlias('@modules-logic/utils/saveFilesToLocal.mjs');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const recordingsDir = join(projectRoot, 'recordings');

/**
 * Process a single recording file
 */
async function processRecordingFile(filePath) {
  try {
    console.log(`\n📁 Processing: ${filePath}`);
    
    const result = await saveFilesFromRecordingFile(filePath, {
      updateRecording: true,
      updateRecordingFile: true,
      processRecordedActions: true,
      processMicroActions: true,
    });

    console.log(`   ✅ Saved ${result.totalSaved} screenshot(s)`);
    console.log(`   📂 Screenshots directory: ${result.screenshotsDir}`);
    
    if (result.errors.length > 0) {
      console.log(`   ⚠️  ${result.errors.length} error(s) occurred`);
      result.errors.forEach((error, i) => {
        console.log(`      ${i + 1}. Action ${error.actionIndex}: ${error.error}`);
      });
    }

    if (result.savedFiles.length > 0) {
      console.log(`   📸 Screenshots saved:`);
      result.savedFiles.forEach((file, i) => {
        const actionInfo = file.isMicroAction 
          ? `microAction[${file.actionIndex}] ${file.actionName || file.actionType}`
          : `recordedAction[${file.actionIndex}] ${file.actionType}`;
        console.log(`      ${i + 1}. ${actionInfo}: ${file.savedCount} file(s)`);
      });
    }

    return result;
  } catch (error) {
    console.error(`   ❌ Error processing ${filePath}:`, error.message);
    return { error: error.message };
  }
}

/**
 * Process all recording files in the recordings directory
 */
async function processAllRecordings() {
  try {
    const files = await readdir(recordingsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    if (jsonFiles.length === 0) {
      console.log('📭 No recording files found in recordings/ directory');
      return;
    }

    console.log(`\n🎬 Found ${jsonFiles.length} recording file(s) to process\n`);

    const results = [];
    for (const file of jsonFiles) {
      const filePath = join(recordingsDir, file);
      const result = await processRecordingFile(filePath);
      results.push({ file, result });
    }

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 PROCESSING SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const successful = results.filter(r => !r.result.error).length;
    const totalScreenshots = results.reduce((sum, r) => {
      return sum + (r.result.totalSaved || 0);
    }, 0);

    console.log(`   ✅ Successfully processed: ${successful}/${results.length} files`);
    console.log(`   📸 Total screenshots saved: ${totalScreenshots}`);
    console.log(`   ❌ Errors: ${results.length - successful}\n`);

  } catch (error) {
    console.error('❌ Error reading recordings directory:', error.message);
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📸 PROCESS RECORDINGS SCREENSHOTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (args.length > 0) {
    // Process specific file
    const filePath = args[0];
    await processRecordingFile(filePath);
  } else {
    // Process all recordings
    await processAllRecordings();
  }

  console.log('\n✅ Processing complete!\n');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

