import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Bundle client agent files for installer
 * 
 * Tasks:
 * - Copy all files from src/modules-client/ to temp directory
 * - Copy src/modules-agents/utils/browser.mjs to temp directory
 * - Generate package.json for client with pkg configuration
 * - Return path to bundled files directory
 * 
 * @returns {Promise<string>} Path to bundled files directory
 */
export async function bundleClientFiles() {
  const tempDir = path.join(__dirname, '../../.temp/client-bundle');
  
  // Create temp directory
  await fs.mkdir(tempDir, { recursive: true });
  
  // Paths
  const clientSourceDir = path.join(__dirname, '../modules-client');
  const browserSourceFile = path.join(__dirname, '../modules-agents/utils/browser.mjs');
  const browserDestFile = path.join(tempDir, 'browser.mjs');
  
  // Copy all files from modules-client
  console.log('📦 Copying client files...');
  const clientFiles = await fs.readdir(clientSourceDir);
  
  for (const file of clientFiles) {
    const sourcePath = path.join(clientSourceDir, file);
    const destPath = path.join(tempDir, file);
    
    const stats = await fs.stat(sourcePath);
    if (stats.isFile()) {
      await fs.copyFile(sourcePath, destPath);
      console.log(`   ✓ ${file}`);
    }
  }
  
  // Copy browser.mjs utility
  console.log('📦 Copying browser utility...');
  await fs.copyFile(browserSourceFile, browserDestFile);
  console.log('   ✓ browser.mjs');
  
  // Generate package.json for client
  const packageJson = {
    name: 'abcd-tools-client',
    version: '1.0.0',
    main: 'agent.js',
    type: 'module',
    pkg: {
      targets: ['node18-win-x64'],
      assets: [
        '.env',
        'workflows/**/*'
      ],
      outputPath: 'dist'
    },
    dependencies: {
      'puppeteer-core': '^24.31.0',
      'dotenv': '^17.2.3',
      'crypto-js': '^4.2.0',
      'uuid': '^9.0.0',
      'pixelmatch': '^5.3.0',
      'pngjs': '^7.0.0',
      'jimp': '^0.22.10'
    }
  };
  
  const packageJsonPath = path.join(tempDir, 'package.json');
  await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('   ✓ package.json generated');
  
  console.log(`\n✅ Client files bundled to: ${tempDir}`);
  return tempDir;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  bundleClientFiles()
    .then((dir) => {
      console.log(`\n✅ Bundle complete: ${dir}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Bundle failed:', error);
      process.exit(1);
    });
}
