/**
 * Complete Workflow Example - End-to-End Demonstration
 * 
 * This example demonstrates:
 * 1. Recording a workflow
 * 2. Saving to file
 * 3. Loading from file
 * 4. Executing with WorkflowExecutor
 * 5. Handling results and statistics
 * 
 * Usage: node examples/complete-workflow-example.js [record|playback|both]
 */

import { ActionRecorder } from '../src/modules-recorder/index.mjs';
import { WorkflowExecutor } from '../src/modules-client/workflow-executor.js';
import { WorkflowStorage, createWorkflowStructure } from '../src/modules-client/workflow-storage.js';
import puppeteer from 'puppeteer-core';
import { findChrome } from '../src/modules-agents/utils/browser.js';

// Configuration
const CONFIG = {
  workflow: {
    name: 'Instagram Login Demo',
    platform: 'instagram',
    description: 'Demonstrate visual recording and playback on Instagram login page',
    filename: 'instagram-login-demo',
  },
  credentials: {
    username: process.env.INSTAGRAM_USERNAME || 'demo_user',
    password: process.env.INSTAGRAM_PASSWORD || 'demo_password',
  },
  executorOptions: {
    retryOnFailure: true,
    maxRetries: 3,
    retryDelay: 1000,
    stopOnError: true,
    delayBetweenActions: 1500,
    randomizeDelay: true,
  },
};

/**
 * Record a new workflow
 */
async function recordWorkflow() {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║           RECORDING WORKFLOW                  ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  const recorder = new ActionRecorder();
  
  try {
    // Start recording
    console.log('🎥 Starting recorder...');
    await recorder.startRecording('https://www.instagram.com/', CONFIG.workflow.platform);
    
    console.log('\n📝 Instructions:');
    console.log('   1. Wait for page to load');
    console.log('   2. Click on "Log In" link if needed');
    console.log('   3. Click in username field and type (any text)');
    console.log('   4. Click in password field and type (any text)');
    console.log('   5. Optionally click "Log In" button');
    console.log('   6. Press Ctrl+C in terminal when done\n');
    console.log('💡 Watch for visual indicators:');
    console.log('   🔴 Red outline = Click recorded');
    console.log('   🟢 Green outline = Input recorded\n');
    
    // Wait for user to finish (Ctrl+C or timeout)
    console.log('⏳ Recording... (Press Ctrl+C when done)\n');
    
    // Wait indefinitely until user stops
    await new Promise((resolve) => {
      process.on('SIGINT', resolve);
    });
    
    // Stop recording
    console.log('\n\n⏹️  Stopping recorder...');
    const rawActions = await recorder.stopRecording();
    
    // Convert to micro-actions
    console.log('🔄 Converting to micro-actions...');
    const microActions = recorder.convertToMicroActions(rawActions);
    
    console.log(`✅ Recorded ${microActions.length} actions\n`);
    
    // Show action summary
    console.log('📋 Action Summary:');
    microActions.forEach((action, i) => {
      console.log(`   ${i + 1}. ${action.name} (${action.type})`);
    });
    console.log('');
    
    // Create workflow structure
    const workflow = createWorkflowStructure(
      CONFIG.workflow.name,
      CONFIG.workflow.platform,
      CONFIG.workflow.description,
      microActions
    );
    
    // Save to file
    const storage = new WorkflowStorage();
    const filePath = await storage.saveWorkflow(workflow, CONFIG.workflow.filename);
    
    console.log(`\n✅ Workflow saved to: ${filePath}\n`);
    
    return workflow;
    
  } catch (error) {
    console.error('❌ Recording failed:', error);
    throw error;
  }
}

/**
 * Playback an existing workflow
 */
async function playbackWorkflow() {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║           PLAYING BACK WORKFLOW               ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  let browser;
  
  try {
    // Load workflow
    console.log('📂 Loading workflow...');
    const storage = new WorkflowStorage();
    const workflow = await storage.loadWorkflow(CONFIG.workflow.filename);
    
    console.log(`✅ Loaded: ${workflow.name}`);
    console.log(`   Platform: ${workflow.platform}`);
    console.log(`   Actions: ${workflow.actions.length}`);
    console.log(`   Description: ${workflow.description}\n`);
    
    // Launch browser
    console.log('🚀 Launching browser...');
    const executablePath = findChrome();
    browser = await puppeteer.launch({
      executablePath,
      headless: false,
      devtools: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Create executor
    const executor = new WorkflowExecutor(page, CONFIG.executorOptions);
    
    // Set credentials
    executor.setVariables(CONFIG.credentials);
    
    console.log('✅ Browser ready\n');
    
    // Execute workflow
    const result = await executor.executeWorkflow(workflow.actions);
    
    // Show results
    if (result.success) {
      console.log('\n🎉 Workflow executed successfully!');
    } else {
      console.log('\n⚠️  Workflow completed with errors');
    }
    
    console.log('\n📊 Detailed Results:');
    console.log(`   Duration: ${(result.duration / 1000).toFixed(1)}s`);
    console.log(`   Success rate: ${result.stats.successRate}%`);
    console.log(`   Successful: ${result.stats.successful}`);
    console.log(`   Failed: ${result.stats.failed}`);
    
    // Show failed actions
    if (result.stats.failed > 0) {
      console.log('\n❌ Failed Actions:');
      result.results
        .filter((r) => !r.success)
        .forEach((r) => {
          console.log(`   ${r.index + 1}. ${r.action} - ${r.error}`);
        });
    }
    
    // Keep browser open for inspection
    console.log('\n💡 Browser will remain open for inspection');
    console.log('   Press Ctrl+C to close\n');
    
    await new Promise(() => {}); // Wait indefinitely
    
  } catch (error) {
    console.error('❌ Playback failed:', error);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

/**
 * Record and immediately playback
 */
async function recordAndPlayback() {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║      RECORD AND PLAYBACK WORKFLOW             ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  try {
    // Record
    console.log('📍 Step 1: Recording workflow...\n');
    await recordWorkflow();
    
    // Wait a moment
    console.log('\n⏱️  Waiting 3 seconds before playback...\n');
    await new Promise((resolve) => setTimeout(resolve, 3000));
    
    // Playback
    console.log('📍 Step 2: Playing back workflow...\n');
    await playbackWorkflow();
    
  } catch (error) {
    console.error('❌ Process failed:', error);
    process.exit(1);
  }
}

/**
 * List all saved workflows
 */
async function listWorkflows() {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║           SAVED WORKFLOWS                     ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  const storage = new WorkflowStorage();
  const workflows = await storage.listWorkflows();
  
  if (workflows.length === 0) {
    console.log('   No workflows found. Record one first!\n');
    return;
  }
  
  workflows.forEach((workflow, i) => {
    console.log(`${i + 1}. ${workflow.name}`);
    console.log(`   File: ${workflow.filename}`);
    console.log(`   Platform: ${workflow.platform}`);
    console.log(`   Actions: ${workflow.actionCount}`);
    console.log(`   Updated: ${new Date(workflow.updatedAt).toLocaleString()}`);
    console.log('');
  });
  
  // Show statistics
  const stats = await storage.getStatistics();
  console.log('📊 Statistics:');
  console.log(`   Total workflows: ${stats.totalWorkflows}`);
  console.log(`   Total actions: ${stats.totalActions}`);
  console.log(`   Platforms:`, stats.byPlatform);
  console.log('');
}

/**
 * Show help
 */
function showHelp() {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║      VISUAL WORKFLOW SYSTEM - HELP            ║');
  console.log('╚═══════════════════════════════════════════════╝\n');
  
  console.log('Usage: node examples/complete-workflow-example.js [command]\n');
  
  console.log('Commands:');
  console.log('  record       - Record a new workflow');
  console.log('  playback     - Playback existing workflow');
  console.log('  both         - Record then playback');
  console.log('  list         - List all saved workflows');
  console.log('  help         - Show this help message\n');
  
  console.log('Environment Variables:');
  console.log('  INSTAGRAM_USERNAME - Username for login (optional)');
  console.log('  INSTAGRAM_PASSWORD - Password for login (optional)\n');
  
  console.log('Examples:');
  console.log('  # Record a workflow');
  console.log('  node examples/complete-workflow-example.js record\n');
  
  console.log('  # Playback with credentials');
  console.log('  INSTAGRAM_USERNAME="myuser" INSTAGRAM_PASSWORD="mypass" \\');
  console.log('    node examples/complete-workflow-example.js playback\n');
  
  console.log('  # Record and immediately playback');
  console.log('  node examples/complete-workflow-example.js both\n');
}

/**
 * Main entry point
 */
async function main() {
  const command = process.argv[2] || 'help';
  
  try {
    switch (command.toLowerCase()) {
      case 'record':
        await recordWorkflow();
        process.exit(0);
        break;
        
      case 'playback':
      case 'play':
        await playbackWorkflow();
        break;
        
      case 'both':
        await recordAndPlayback();
        break;
        
      case 'list':
        await listWorkflows();
        process.exit(0);
        break;
        
      case 'help':
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
        
      default:
        console.error(`\n❌ Unknown command: ${command}\n`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
