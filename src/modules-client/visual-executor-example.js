/**
 * Visual Executor - Complete Example
 * 
 * This example demonstrates how to:
 * 1. Load recorded micro-actions
 * 2. Execute them using VisualActionExecutor
 * 3. Handle different action types
 * 4. Track execution statistics
 * 
 * Usage: node src/modules-client/visual-executor-example.js
 */

import { VisualActionExecutor } from './visual-executor.js';
import puppeteer from 'puppeteer-core';
import { findChrome } from '../modules-agents/utils/browser.js';

// Example: Recorded micro-actions from a login workflow
const RECORDED_ACTIONS = [
  // Action 1: Navigate
  {
    name: 'Navigate to Instagram',
    type: 'navigate',
    params: {
      url: 'https://www.instagram.com/',
      waitUntil: 'networkidle2',
    },
  },

  // Action 2: Wait for page load
  {
    name: 'Wait for page load',
    type: 'wait',
    params: {
      duration: 2000,
      randomize: true,
    },
  },

  // Action 3: Click "Log In" button
  {
    name: 'Click "Log In"',
    type: 'click',
    params: {
      visual: {
        screenshot: 'data:image/png;base64,iVBORw0KGgo...',
        text: 'Log In',
        position: {
          absolute: { x: 640, y: 450 },
          relative: { x: 50, y: 62.5 },
        },
        boundingBox: {
          x: 590,
          y: 430,
          width: 100,
          height: 40,
        },
        surroundingText: ['Instagram', 'Sign up', 'Forgot password?'],
        timestamp: 1701691234567,
      },
      backup_selector: 'button[type="submit"]',
      execution_method: 'visual_first',
    },
  },

  // Action 4: Type username
  {
    name: 'Type in "Username"',
    type: 'type',
    params: {
      visual: {
        screenshot: 'data:image/png;base64,iVBORw0KGgo...',
        text: '',
        placeholder: 'Phone number, username, or email',
        inputType: 'text',
        position: {
          absolute: { x: 640, y: 300 },
          relative: { x: 50, y: 41.67 },
        },
        boundingBox: {
          x: 490,
          y: 280,
          width: 300,
          height: 40,
        },
        surroundingText: ['Username', 'aria:Username input'],
        timestamp: 1701691235678,
      },
      backup_selector: 'input[name="username"]',
      text: '{{username}}', // Template variable
      typeSpeed: 'normal',
      execution_method: 'visual_first',
    },
  },

  // Action 5: Type password
  {
    name: 'Type in "Password"',
    type: 'type',
    params: {
      visual: {
        screenshot: 'data:image/png;base64,iVBORw0KGgo...',
        text: '',
        placeholder: 'Password',
        inputType: 'password',
        position: {
          absolute: { x: 640, y: 360 },
          relative: { x: 50, y: 50 },
        },
        boundingBox: {
          x: 490,
          y: 340,
          width: 300,
          height: 40,
        },
        surroundingText: ['Password', 'aria:Password input'],
        timestamp: 1701691236789,
      },
      backup_selector: 'input[name="password"]',
      text: '{{password}}', // Template variable
      typeSpeed: 'normal',
      execution_method: 'visual_first',
    },
  },

  // Action 6: Wait before submit
  {
    name: 'Wait before submit',
    type: 'wait',
    params: {
      duration: 1500,
      randomize: true,
    },
  },

  // Action 7: Click submit
  {
    name: 'Click "Log In" submit',
    type: 'click',
    params: {
      visual: {
        screenshot: 'data:image/png;base64,iVBORw0KGgo...',
        text: 'Log In',
        position: {
          absolute: { x: 640, y: 420 },
          relative: { x: 50, y: 58.33 },
        },
        boundingBox: {
          x: 490,
          y: 400,
          width: 300,
          height: 40,
        },
        surroundingText: ['Username', 'Password', 'Forgot password?'],
        timestamp: 1701691237890,
      },
      backup_selector: 'button[type="submit"]',
      execution_method: 'visual_first',
    },
  },

  // Action 8: Wait for login
  {
    name: 'Wait for login to complete',
    type: 'wait',
    params: {
      duration: 3000,
      randomize: false,
    },
  },
];

/**
 * Replace template variables with actual values
 */
function replaceTemplateVariables(text, variables) {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

/**
 * Execute a workflow (list of actions)
 */
async function executeWorkflow(actions, variables = {}) {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║   VISUAL EXECUTOR - WORKFLOW PLAYBACK        ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  let browser;
  try {
    // Launch browser
    const executablePath = findChrome();
    console.log('🔍 Found Chrome at:', executablePath);

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
    const executor = new VisualActionExecutor(page);
    executor.setDebugMode(true);

    console.log(`📋 Executing ${actions.length} actions...\n`);

    // Execute each action
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      console.log(`\n[${i + 1}/${actions.length}] ${action.name}`);
      console.log('─'.repeat(50));

      try {
        // Handle different action types
        switch (action.type) {
          case 'navigate': {
            console.log(`🌐 Navigating to: ${action.params.url}`);
            await page.goto(action.params.url, {
              waitUntil: action.params.waitUntil || 'networkidle2',
              timeout: 30000,
            });
            console.log('✅ Navigation complete');
            break;
          }

          case 'wait': {
            let duration = action.params.duration;
            if (action.params.randomize) {
              // Add ±20% randomness
              const variation = duration * 0.2;
              duration = duration + (Math.random() * variation * 2 - variation);
            }
            console.log(`⏱️  Waiting ${Math.round(duration)}ms...`);
            await new Promise(resolve => setTimeout(resolve, Math.round(duration)));
            console.log('✅ Wait complete');
            break;
          }

          case 'click':
          case 'type': {
            // Replace template variables
            if (action.type === 'type' && action.params.text) {
              action.params.text = replaceTemplateVariables(
                action.params.text,
                variables
              );
            }

            // Execute action
            const result = await executor.executeAction(action);

            if (result.success) {
              console.log(`✅ Success (method: ${result.method})`);
            } else {
              console.error(`❌ Failed: ${result.error}`);
              console.error('   Stopping workflow execution');
              return false;
            }
            break;
          }

          case 'screenshot': {
            console.log('📸 Taking screenshot...');
            const screenshot = await page.screenshot({
              path: action.params.path || `screenshot-${Date.now()}.png`,
            });
            console.log('✅ Screenshot saved');
            break;
          }

          default: {
            console.warn(`⚠️  Unknown action type: ${action.type}`);
          }
        }

        // Small delay between actions for human-like behavior
        if (i < actions.length - 1 && action.type !== 'wait') {
          const delay = 500 + Math.random() * 500; // 500-1000ms
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (error) {
        console.error(`❌ Error executing action: ${error.message}`);
        console.error('   Stopping workflow execution');
        return false;
      }
    }

    // Show execution statistics
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║   EXECUTION STATISTICS                        ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    const stats = executor.getStats();
    console.log('📊 Execution Stats:');
    console.log(`   Total actions: ${stats.total}`);
    console.log(`   Success rate: ${stats.successRate}`);
    console.log(`   Selector-based: ${stats.selectorSuccess}`);
    console.log(`   Text-based: ${stats.textSuccess}`);
    console.log(`   Visual-based: ${stats.visualSuccess}`);
    console.log(`   Position-based: ${stats.positionSuccess}`);
    console.log(`   Failures: ${stats.failures}`);

    console.log('\n✅ Workflow completed successfully!\n');

    // Keep browser open for inspection
    console.log('💡 Browser will remain open for manual inspection');
    console.log('   Press Ctrl+C to close\n');

    // Wait indefinitely (user can inspect)
    await new Promise(() => {});

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    if (browser) {
      await browser.close();
    }
    process.exit(1);
  }
}

// Main execution
(async () => {
  // Template variables (credentials)
  const variables = {
    username: process.env.INSTAGRAM_USERNAME || 'test_user',
    password: process.env.INSTAGRAM_PASSWORD || 'test_password',
    email: process.env.INSTAGRAM_EMAIL || 'test@example.com',
  };

  console.log('📝 Using template variables:');
  console.log(`   username: ${variables.username}`);
  console.log(`   password: ${'*'.repeat(variables.password.length)}`);
  console.log(`   email: ${variables.email}\n`);

  await executeWorkflow(RECORDED_ACTIONS, variables);
})();
