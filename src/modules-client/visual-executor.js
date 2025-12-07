import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import Jimp from 'jimp';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * VisualActionExecutor - Executes recorded actions using VISUAL DATA
 * 
 * Execution Strategy (visual recording approach):
 * 1. Try backup_selector (fast path) - verify with text if available
 * 2. Find by text content + position (robust path)
 *    - Search DOM for matching text
 *    - Filter by position (within 15% tolerance)
 *    - If single match, use it
 * 3. Find by screenshot comparison (most robust)
 *    - Screenshot each candidate element
 *    - Compare with recorded screenshot using pixelmatch
 *    - Return candidate with highest similarity (>70% threshold)
 * 4. Click at recorded coordinates (last resort)
 * 
 * Execution Method Priorities:
 * - selector_first: Try selector first, fallback to visual (fast)
 * - visual_first: Try visual first, fallback to selector (robust)
 * - visual_only: Use only visual data, ignore selector (most robust)
 * 
 * This approach makes automation resilient to UI changes.
 * 
 * TODO (Future Enhancements):
 * - OCR-based text extraction using tesseract.js for better text matching
 * - ML-based element matching for improved accuracy
 * - Fuzzy text matching with fuse.js for typo tolerance
 * 
 * @class VisualActionExecutor
 */
export class VisualActionExecutor {
  constructor(page) {
    this.page = page;
    this.debugMode = false;
    this.executionStats = {
      selectorSuccess: 0,
      textSuccess: 0,
      visualSuccess: 0,
      positionSuccess: 0,
      failures: 0,
    };
  }

  /**
   * Execute a recorded action using visual data
   * Tries backup_selector first (fast path), then falls back to visual search if selector fails
   * @param {Object} action - Micro-action with visual data
   * @returns {Promise<Object>} { success: boolean, method: string, error?: string }
   */
  async executeAction(action) {
    const startTime = Date.now();
    console.log(`▶️  Executing: ${action.name || action.type}`);

    try {
      // Special handling for upload actions - bypass visual matching
      // Just find any file input on the page and use setInputFiles directly
      if (action.type === 'upload') {
        return await this.handleUploadAction(action);
      }

      let result = null;

      // Support both formats: new format (visual/backup_selector at top level) and old format (in params)
      const backupSelector = action.backup_selector || action.params?.backup_selector;
      const visualData = action.visual || action.params?.visual;

      // Step 1: Try backup selector (fast path)
      if (backupSelector) {
        result = await this.trySelector(action, backupSelector, visualData);
        if (result.success) {
          this.executionStats.selectorSuccess++;
          console.log(`✅ Found by selector in ${Date.now() - startTime}ms`);
          return result;
        }
      }

      // Step 2: Try finding by visual data (robust path)
      if (visualData) {
        result = await this.findByVisual(action, visualData);
        if (result.success) {
          console.log(`✅ Found by visual search in ${Date.now() - startTime}ms`);
          return result;
        }
      }

      // Step 3: Last resort - click at recorded coordinates
      if (action.type === 'click' && visualData?.position) {
        result = await this.clickAtPosition(
          visualData.position.absolute.x,
          visualData.position.absolute.y
        );
        if (result.success) {
          this.executionStats.positionSuccess++;
          console.log(`✅ Clicked at coordinates in ${Date.now() - startTime}ms`);
          return result;
        }
      }

      // All methods failed
      this.executionStats.failures++;
      console.error(`❌ Failed to execute action: ${action.name}`);
      return {
        success: false,
        method: 'none',
        error: 'Element not found by any method',
      };

    } catch (error) {
      this.executionStats.failures++;
      console.error(`❌ Error executing action:`, error);
      return {
        success: false,
        method: 'error',
        error: error.message,
      };
    }
  }

  /**
   * Helper method to wait (replaces page.waitForTimeout for compatibility)
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise<void>}
   */
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wait for modal to appear and return modal element
   * @param {number} timeout - Maximum time to wait in milliseconds
   * @returns {Promise<Object|null>} Modal element handle or null
   */
  async waitForModal(timeout = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const modal = await this.page.evaluateHandle(() => {
        // Check for modals by various methods
        const modals = [
          ...document.querySelectorAll('[role="dialog"]'),
          ...document.querySelectorAll('[aria-modal="true"]'),
          ...document.querySelectorAll('dialog'),
        ];
        
        // Also check for common modal class patterns
        const modalSelectors = [
          '[class*="modal"]',
          '[class*="dialog"]',
          '[class*="overlay"]',
          '[id*="modal"]',
          '[id*="dialog"]',
        ];
        
        for (const selector of modalSelectors) {
          try {
            const elements = document.querySelectorAll(selector);
            for (const el of elements) {
              const style = window.getComputedStyle(el);
              // Check if visible (not display:none)
              if (style.display !== 'none' && el.offsetParent !== null) {
                modals.push(el);
              }
            }
          } catch (e) {
            // Ignore selector errors
          }
        }
        
        // Return the first visible modal
        for (const modal of modals) {
          const style = window.getComputedStyle(modal);
          const rect = modal.getBoundingClientRect();
          if (style.display !== 'none' && rect.width > 0 && rect.height > 0) {
            return modal;
          }
        }
        
        return null;
      });
      
      if (modal && modal.asElement()) {
        console.log('📦 Modal detected');
        return modal;
      }
      
      await this.wait(200); // Check every 200ms
    }
    
    return null;
  }

  /**
   * Check if element is inside a modal
   * @param {Object} elementHandle - Puppeteer element handle
   * @returns {Promise<boolean>} True if element is in a modal
   */
  async isInModal(elementHandle) {
    if (!elementHandle || !elementHandle.asElement()) {
      return false;
    }
    
    return await this.page.evaluate((el) => {
      if (!el) return false;
      
      // Check if element or any parent is a modal
      let current = el;
      while (current && current !== document.body) {
        const isModal = 
          current.getAttribute?.('role') === 'dialog' ||
          current.getAttribute?.('aria-modal') === 'true' ||
          current.tagName === 'DIALOG' ||
          (current.className && /modal|dialog|overlay/i.test(current.className)) ||
          (current.id && /modal|dialog/i.test(current.id));
        
        if (isModal) {
          return true;
        }
        
        current = current.parentElement;
      }
      
      return false;
    }, elementHandle);
  }

  /**
   * Handle upload action - find file input and set file directly
   * This bypasses visual matching and just searches for any file input on the page
   * Note: On mobile viewports (like iPhone 12 Pro), Instagram opens native file picker
   * instead of a modal, so we try to find the file input immediately without waiting for modal
   * @param {Object} action - Upload action
   * @returns {Promise<Object>} Execution result
   */
  async handleUploadAction(action) {
    console.log('📤 Upload action: Searching for file input element...');
    
    // Check multiple locations for filePath (top level, params, or imagePath alias)
    const filePath = action.filePath || action.params?.filePath || action.params?.imagePath || action.imagePath || '';
    if (!filePath) {
      return { success: false, method: 'upload', error: 'No filePath provided for upload action' };
    }
    
    // Check if filePath is a URL (starts with http:// or https://)
    let localFilePath = filePath;
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      console.log(`📥 Downloading file from URL: ${filePath}`);
      try {
        // Download file from URL to temporary location
        localFilePath = await this.downloadFileFromUrl(filePath);
        console.log(`✅ File downloaded to: ${localFilePath}`);
      } catch (error) {
        return { success: false, method: 'upload', error: `Failed to download file: ${error.message}` };
      }
    }
    
    // Verify file exists
    if (!fs.existsSync(localFilePath)) {
      return { success: false, method: 'upload', error: `File not found: ${localFilePath}` };
    }
    
    // Wait for modal to appear (Instagram shows upload modal after clicking "New post")
    // On desktop viewport, modal appears; on mobile, native file picker opens
    console.log('⏳ Waiting for upload modal or file input to appear...');
    const modal = await this.waitForModal(3000); // Wait up to 3 seconds for modal
    if (modal && modal.asElement()) {
      console.log('📦 Upload modal detected');
    }
    
    // Give a brief moment for the page to settle after clicking "Post" button
    // Instagram may add file inputs dynamically, so we wait a bit
    await this.wait(500);
    
    // Find ANY file input on the page (including hidden ones)
    // Instagram has exactly 2 file inputs:
    // 1. One with accept="image/avif,image/jpeg,image/png" (broader, preferred)
    // 2. One with accept="image/jpeg" (narrower)
    // Both are inside forms with role="presentation" and are typically hidden
    // They may be in a modal or in the main document
    let fileInput = null;
    let attempts = 0;
    const maxAttempts = 5; // Increased retries for mobile viewport (inputs may be added dynamically)
    
    // Determine file extension to match accept attribute
    const fileExt = path.extname(localFilePath).toLowerCase().replace('.', '');
    const mimeTypeMap = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'avif': 'image/avif',
      'webp': 'image/webp'
    };
    const fileMimeType = mimeTypeMap[fileExt] || 'image/jpeg';
    
    while (!fileInput && attempts < maxAttempts) {
      const fileInputHandle = await this.page.evaluateHandle((preferredMimeType) => {
        // Find all file inputs on the page (including hidden ones)
        // Instagram has inputs inside forms with role="presentation"
        // Check in modal first, then document
        let fileInputs = [];
        
        // Check for modal and search within it
        const modals = [
          ...document.querySelectorAll('[role="dialog"]'),
          ...document.querySelectorAll('[aria-modal="true"]'),
          ...document.querySelectorAll('dialog'),
        ];
        
        let modalFound = null;
        for (const modal of modals) {
          const style = window.getComputedStyle(modal);
          const rect = modal.getBoundingClientRect();
          if (style.display !== 'none' && rect.width > 0 && rect.height > 0) {
            modalFound = modal;
            break;
          }
        }
        
        if (modalFound) {
          // Search in modal first
          fileInputs = Array.from(modalFound.querySelectorAll('input[type="file"]'));
          if (fileInputs.length > 0) {
            console.log('📦 Found file inputs in modal:', fileInputs.length);
          }
        }
        
        // If not found in modal, search entire document
        if (fileInputs.length === 0) {
          fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
        }
        
        console.log(`🔍 Found ${fileInputs.length} file input(s) on page`);
        
        if (fileInputs.length === 0) {
          console.log('⚠️  No file inputs found in DOM');
          return null;
        }
        
        // Log all found inputs for debugging
        fileInputs.forEach((input, idx) => {
          const accept = input.getAttribute('accept') || 'none';
          const style = window.getComputedStyle(input);
          const rect = input.getBoundingClientRect();
          const isVisible = style.display !== 'none' && rect.width > 0 && rect.height > 0;
          console.log(`   Input ${idx + 1}: accept="${accept}", visible=${isVisible}, display=${style.display}`);
        });
        
        // Strategy 1: Try to find one that matches the file type (check accept attribute)
        for (const input of fileInputs) {
          const accept = input.getAttribute('accept') || '';
          // Check if accept attribute includes our file type
          if (accept && accept.includes(preferredMimeType)) {
            console.log(`✅ Found file input matching ${preferredMimeType}: accept="${accept}"`);
            return input;
          }
        }
        
        // Strategy 2: Prefer the input with broader accept (e.g., "image/avif,image/jpeg,image/png" over "image/jpeg")
        // This matches Instagram's structure where one input accepts multiple formats
        const sortedInputs = fileInputs.sort((a, b) => {
          const aAccept = a.getAttribute('accept') || '';
          const bAccept = b.getAttribute('accept') || '';
          // Prefer inputs with more accept types (broader)
          const aCount = aAccept.split(',').length;
          const bCount = bAccept.split(',').length;
          if (aCount !== bCount) {
            return bCount - aCount; // More accept types = better
          }
          // If same count, prefer one that includes our preferred type
          if (aAccept.includes(preferredMimeType) && !bAccept.includes(preferredMimeType)) {
            return -1;
          }
          if (!aAccept.includes(preferredMimeType) && bAccept.includes(preferredMimeType)) {
            return 1;
          }
          return 0;
        });
        
        // Strategy 3: If no match, prefer visible ones first, but accept hidden ones too
        for (const input of sortedInputs) {
          const style = window.getComputedStyle(input);
          const rect = input.getBoundingClientRect();
          // Accept if visible OR if hidden but in the DOM
          // Hidden inputs often have display:none but are still functional
          if (style.display !== 'none' || rect.width > 0 || rect.height > 0) {
            const accept = input.getAttribute('accept') || 'none';
            console.log(`✅ Found file input (visible or functional): accept="${accept}"`);
            return input;
          }
        }
        
        // Strategy 4: Return the first one from sorted list (even if hidden)
        // Instagram's inputs are typically hidden but functional
        const selected = sortedInputs[0];
        const accept = selected.getAttribute('accept') || 'none';
        console.log(`✅ Using first available file input (${fileInputs.length} total found): accept="${accept}"`);
        return selected;
      }, fileMimeType);
      
      fileInput = fileInputHandle.asElement();
      
      if (!fileInput) {
        attempts++;
        if (attempts < maxAttempts) {
          console.log(`⚠️  File input not found (attempt ${attempts}/${maxAttempts}), waiting and retrying...`);
          // Wait a bit longer on later attempts (inputs may be added dynamically)
          await this.wait(attempts * 500); // Progressive delay: 500ms, 1000ms, 1500ms, etc.
        }
      } else {
        // Log which input we found
        const acceptAttr = await fileInput.evaluate(el => el.getAttribute('accept') || 'none');
        const isVisible = await fileInput.evaluate(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none';
        });
        console.log(`📎 Selected file input: accept="${acceptAttr}", visible=${isVisible}`);
      }
    }
    
    if (!fileInput) {
      // Get page info for better error message
      const pageInfo = await this.page.evaluate(() => {
        const inputs = document.querySelectorAll('input[type="file"]');
        return {
          url: window.location.href,
          inputCount: inputs.length,
          inputs: Array.from(inputs).map(input => ({
            accept: input.getAttribute('accept') || 'none',
            visible: window.getComputedStyle(input).display !== 'none'
          }))
        };
      });
      
      return { 
        success: false, 
        method: 'upload', 
        error: `No file input element found on page after ${maxAttempts} attempts. Found ${pageInfo.inputCount} input(s) on ${pageInfo.url}. This may be a viewport issue - try desktop viewport or ensure "Post" button was clicked successfully.` 
      };
    }
    
    // Use setInputFiles to set the file directly (avoids opening file picker)
    try {
      console.log('✅ Found file input, setting file...');
      await fileInput.setInputFiles(localFilePath);
      console.log('✅ File set successfully via setInputFiles');
      
      // Wait a moment to ensure the file is processed
      await this.wait(500);
      
      // Clean up temporary file if it was downloaded
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        // Don't delete immediately - wait a bit in case upload is still processing
        setTimeout(() => {
          try {
            if (fs.existsSync(localFilePath)) {
              fs.unlinkSync(localFilePath);
              console.log(`🧹 Cleaned up temporary file: ${localFilePath}`);
            }
          } catch (err) {
            // Ignore cleanup errors
            console.warn(`⚠️  Could not clean up temp file: ${err.message}`);
          }
        }, 10000); // 10 seconds
      }
      
      return { success: true, method: 'upload' };
    } catch (error) {
      return { success: false, method: 'upload', error: `Failed to set file: ${error.message}` };
    }
  }

  /**
   * Try to find and execute action using backup selector (fast path)
   * Verifies element text matches recorded text if text exists
   * @param {Object} action - Action to execute
   * @param {string} selector - CSS selector to try
   * @param {Object} visualData - Visual data for verification
   * @returns {Promise<Object>} Execution result or null if not found
   */
  async trySelector(action, selector, visualData) {
    try {
      const timeout = 5000; // 5 seconds max timeout

      // First, wait for modal if it might appear (e.g., after clicking "New post")
      // This helps when elements are inside modals
      await this.waitForModal(2000).catch(() => null);

      // Wait for element to exist (with timeout)
      // Try searching in modal first, then document
      let element = null;
      
      // Check if element is in a modal
      const modal = await this.waitForModal(1000);
      if (modal && modal.asElement()) {
        element = await modal.asElement().$(selector).catch(() => null);
        if (element) {
          console.log('📦 Found element in modal');
        }
      }
      
      // If not found in modal, search in document
      if (!element) {
        await this.page.waitForSelector(selector, { timeout, visible: true }).catch(() => null);
        element = await this.page.$(selector);
      }

      if (!element) {
        return { success: false, method: 'selector' };
      }

      // Verify element text matches recorded text (if text exists)
      if (visualData?.text) {
        const elementText = await this.page.evaluate(
          (sel) => {
            const el = document.querySelector(sel);
            return el ? el.textContent.trim() : '';
          },
          selector
        );

        const recordedText = visualData.text.trim();
        
        // Allow partial match (recorded text is substring of current text, or vice versa)
        if (recordedText && !elementText.includes(recordedText) && !recordedText.includes(elementText)) {
          console.warn(`⚠️  Text mismatch: expected "${recordedText}", found "${elementText}"`);
          // Don't fail completely, but prefer other methods
          return { success: false, method: 'selector', reason: 'text_mismatch' };
        }
      }

      // Execute action based on type
      if (action.type === 'click') {
        await element.click();
        return { success: true, method: 'selector' };
      } else if (action.type === 'type') {
        // Support both formats for text value
        const textValue = action.text || action.params?.text || '';
        await element.type(textValue, { delay: 50 });
        return { success: true, method: 'selector' };
      } else if (action.type === 'upload') {
        // Upload actions are handled at the top level in executeAction
        // This should not be reached, but handle it just in case
        return await this.handleUploadAction(action);
      }

      return { success: false, method: 'selector', error: 'Unsupported action type' };

    } catch (error) {
      return { success: false, method: 'selector', error: error.message };
    }
  }

  /**
   * Find element by visual data (robust path)
   * 
   * Visual search strategy:
   * Step 1: Find all elements with matching text content
   *   - Uses page.evaluate() to search DOM for text
   *   - Returns array of candidate elements with positions
   * Step 2: Filter candidates by approximate position
   *   - Calculate distance between candidate position and recorded relative position
   *   - Keep candidates within 15% of original position
   *   - If only one match, return it (success!)
   * Step 3: If multiple matches, use image comparison
   *   - Screenshot each candidate element
   *   - Compare with recorded screenshot using pixelmatch
   *   - Return candidate with highest similarity score (>70% threshold)
   * 
   * @param {Object} action - Action to execute
   * @param {Object} visualData - Visual data object with screenshot, text, position, etc.
   * @returns {Promise<Object>} Execution result with { success: boolean, method: string } or null if not found
   */
  async findByVisual(action, visualData) {
    try {
      // Step 1: Find all elements with matching text content
      const textCandidates = await this.findByText(visualData.text);
      
      if (textCandidates.length === 0) {
        console.warn('⚠️  No elements found with matching text');
        return { success: false, method: 'visual', reason: 'no_text_match' };
      }

      console.log(`🔍 Found ${textCandidates.length} candidates by text`);

      // Step 2: Filter candidates by approximate position
      // Calculate distance between candidate position and recorded relative position
      // Keep candidates within 15% of original position
      const positionCandidates = this.filterByPosition(
        textCandidates,
        visualData.position.relative,
        15 // 15% tolerance
      );

      if (positionCandidates.length === 0) {
        console.warn('⚠️  No elements at expected position');
        return { success: false, method: 'visual', reason: 'no_position_match' };
      }

      console.log(`🔍 ${positionCandidates.length} candidates match position`);

      // Step 3: If only one match, return it (success!)
      if (positionCandidates.length === 1) {
        this.executionStats.textSuccess++;
        return await this.executeOnCandidate(positionCandidates[0], action);
      }

      // Step 3 (continued): If multiple matches, use image comparison
      if (visualData.screenshot) {
        // Screenshot each candidate element
        // Compare with recorded screenshot using pixelmatch
        // Return candidate with highest similarity score (>70% threshold)
        const bestMatch = await this.findBestVisualMatch(
          positionCandidates,
          visualData.screenshot
        );

        if (bestMatch) {
          this.executionStats.visualSuccess++;
          return await this.executeOnCandidate(bestMatch, action);
        }
      }

      // No screenshot or no good match - use first position candidate as fallback
      console.warn('⚠️  Using first position candidate (no screenshot match)');
      this.executionStats.textSuccess++;
      return await this.executeOnCandidate(positionCandidates[0], action);

    } catch (error) {
      return { success: false, method: 'visual', error: error.message };
    }
  }

  /**
   * Find elements by text content (text-based fallback)
   * Uses page.evaluate() to search DOM for text
   * Supports partial text matching (contains, not exact)
   * Prioritizes searching in modals if they exist
   * @param {string} text - Text to search for
   * @returns {Promise<Array>} Array of matches with positions
   */
  async findByText(text) {
    if (!text || text.trim().length === 0) {
      return [];
    }

    // Check for modal first - prioritize searching in modals
    const modal = await this.waitForModal(1000);
    const hasModal = modal && modal.asElement();

    const candidates = await this.page.evaluate((searchText, hasModal) => {
      const results = [];
      const processedElements = new Set();
      
      // Find modal if it exists
      let searchRoot = document.body;
      if (hasModal) {
        const modals = [
          ...document.querySelectorAll('[role="dialog"]'),
          ...document.querySelectorAll('[aria-modal="true"]'),
          ...document.querySelectorAll('dialog'),
        ];
        
        // Find visible modal
        for (const modal of modals) {
          const style = window.getComputedStyle(modal);
          const rect = modal.getBoundingClientRect();
          if (style.display !== 'none' && rect.width > 0 && rect.height > 0) {
            searchRoot = modal;
            console.log('📦 Searching in modal first');
            break;
          }
        }
      }
      
      // Search all text nodes and their parent elements
      const walker = document.createTreeWalker(
        searchRoot,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      let textNode;

      while ((textNode = walker.nextNode())) {
        const textContent = textNode.textContent?.trim() || '';
        
        // Check if contains search text (case-insensitive, partial match)
        if (textContent.toLowerCase().includes(searchText.toLowerCase())) {
          const parentElement = textNode.parentElement;
          
          // Skip if already processed
          if (processedElements.has(parentElement)) continue;
          processedElements.add(parentElement);

          const rect = parentElement.getBoundingClientRect();
          
          // Skip hidden elements
          if (rect.width === 0 || rect.height === 0) continue;

          // Calculate center position
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;

          results.push({
            text: textContent.substring(0, 200),
            position: {
              absolute: {
                x: Math.round(centerX),
                y: Math.round(centerY),
              },
              relative: {
                x: parseFloat(((centerX / window.innerWidth) * 100).toFixed(2)),
                y: parseFloat(((centerY / window.innerHeight) * 100).toFixed(2)),
              },
            },
            boundingBox: {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            },
            element: parentElement, // Keep reference for screenshot
          });
        }
      }

      // Also search direct element text content (for elements without text nodes)
      // Prioritize modal elements if modal exists
      let allElements = [];
      if (hasModal && searchRoot !== document.body) {
        // Search in modal first
        allElements = searchRoot.querySelectorAll('*');
      } else {
        // Search entire document
        allElements = document.querySelectorAll('*');
      }
      
      for (const element of allElements) {
        if (processedElements.has(element)) continue;

        const textContent = element.textContent?.trim() || '';
        if (!textContent) continue;

        // Check if contains search text (case-insensitive, partial match)
        if (textContent.toLowerCase().includes(searchText.toLowerCase())) {
          const rect = element.getBoundingClientRect();
          
          // Skip hidden elements
          if (rect.width === 0 || rect.height === 0) continue;

          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;

          results.push({
            text: textContent.substring(0, 200),
            position: {
              absolute: {
                x: Math.round(centerX),
                y: Math.round(centerY),
              },
              relative: {
                x: parseFloat(((centerX / window.innerWidth) * 100).toFixed(2)),
                y: parseFloat(((centerY / window.innerHeight) * 100).toFixed(2)),
              },
            },
            boundingBox: {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            },
            element: element,
          });
        }
      }

      return results;
    }, text.trim());

    return candidates;
  }

  /**
   * Filter candidates by position (within tolerance)
   * @param {Array} candidates - Candidate elements
   * @param {Object} targetPosition - Target relative position {x%, y%}
   * @returns {Array} Filtered candidates
   */
  filterByPosition(candidates, targetPosition, tolerance = 15) {
    return candidates.filter((candidate) => {
      const xDiff = Math.abs(candidate.position.relative.x - targetPosition.x);
      const yDiff = Math.abs(candidate.position.relative.y - targetPosition.y);

      // Within tolerance percentage
      return xDiff <= tolerance && yDiff <= tolerance;
    });
  }

  /**
   * Find best visual match using screenshot comparison
   * Screenshots each candidate element and compares with recorded screenshot using pixelmatch
   * @param {Array} candidates - Candidate elements with positions
   * @param {string} targetScreenshot - Base64 screenshot to match
   * @returns {Promise<Object|null>} Best matching candidate with highest similarity score (>70% threshold) or null
   */
  async findBestVisualMatch(candidates, targetScreenshot) {
    console.log(`🔍 Comparing ${candidates.length} candidates with screenshot...`);

    let bestMatch = null;
    let bestScore = 0;

    for (const candidate of candidates) {
      try {
        // Take screenshot of candidate element using Puppeteer
        // First try to get element handle from bounding box
        const elementHandle = await this.page.evaluateHandle((bbox) => {
          return document.elementFromPoint(
            bbox.x + bbox.width / 2,
            bbox.y + bbox.height / 2
          );
        }, candidate.boundingBox);

        if (!elementHandle || elementHandle.asElement() === null) {
          console.warn('⚠️  Could not find element at position');
          continue;
        }

        // Screenshot the element
        const elementScreenshot = await elementHandle.asElement().screenshot({
          encoding: 'base64',
          type: 'png',
        }).catch(async () => {
          // Fallback: try html2canvas if available (client-side)
          return await this.page.evaluate(async (bbox) => {
            if (window.html2canvas) {
              const element = document.elementFromPoint(
                bbox.x + bbox.width / 2,
                bbox.y + bbox.height / 2
              );
              if (element) {
                const canvas = await html2canvas(element, {
                  logging: false,
                  allowTaint: true,
                  useCORS: true,
                  scale: 1,
                });
                return canvas.toDataURL('image/png');
              }
            }
            return null;
          }, candidate.boundingBox);
        });

        if (!elementScreenshot) {
          console.warn('⚠️  Could not capture element screenshot');
          continue;
        }

        // Convert Puppeteer screenshot to data URL format if needed
        const screenshotDataUrl = typeof elementScreenshot === 'string' 
          ? elementScreenshot 
          : `data:image/png;base64,${elementScreenshot}`;

        // Compare screenshots
        const similarityScore = await this.compareImages(
          targetScreenshot,
          screenshotDataUrl
        );

        console.log(`   Candidate similarity: ${(similarityScore * 100).toFixed(1)}%`);

        if (similarityScore > bestScore) {
          bestScore = similarityScore;
          bestMatch = candidate;
        }

      } catch (error) {
        console.warn('⚠️  Error comparing screenshot:', error.message);
      }
    }

    // Require at least 70% similarity threshold
    if (bestScore >= 0.7) {
      console.log(`✅ Best match found with ${(bestScore * 100).toFixed(1)}% similarity`);
      return bestMatch;
    }

    console.warn(`⚠️  No match above 70% threshold (best: ${(bestScore * 100).toFixed(1)}%)`);
    return null;
  }

  /**
   * Compare two images and return similarity score (image comparison utility)
   * 
   * Process:
   * 1. Decode both base64 images
   * 2. Resize to same dimensions if different (maintains aspect ratio)
   * 3. Use pixelmatch to calculate similarity score
   * 4. Return score between 0 (no match) and 1 (perfect match)
   * 
   * Handles errors gracefully:
   * - Invalid images: returns 0
   * - Decode failures: returns 0
   * - Size mismatches: resizes to match
   * 
   * @param {string} img1Base64 - First image (base64 data URL)
   * @param {string} img2Base64 - Second image (base64 data URL)
   * @returns {Promise<number>} Similarity score between 0 (no match) and 1 (perfect match)
   */
  async compareImages(img1Base64, img2Base64) {
    try {
      // Handle errors: invalid images, decode failures
      if (!img1Base64 || !img2Base64) {
        console.warn('⚠️  One or both images are missing');
        return 0;
      }

      // Remove data URL prefix if present
      const img1Data = img1Base64.replace(/^data:image\/\w+;base64,/, '');
      const img2Data = img2Base64.replace(/^data:image\/\w+;base64,/, '');

      // Decode both base64 images
      let img1, img2;
      try {
        img1 = await Jimp.read(Buffer.from(img1Data, 'base64'));
        img2 = await Jimp.read(Buffer.from(img2Data, 'base64'));
      } catch (decodeError) {
        console.error('Error decoding images:', decodeError);
        return 0;
      }

      // Resize to same dimensions if different (use smaller dimensions to avoid upscaling)
      const width = Math.min(img1.bitmap.width, img2.bitmap.width);
      const height = Math.min(img1.bitmap.height, img2.bitmap.height);

      if (img1.bitmap.width !== width || img1.bitmap.height !== height) {
        img1.resize(width, height, Jimp.RESIZE_BILINEAR);
      }
      if (img2.bitmap.width !== width || img2.bitmap.height !== height) {
        img2.resize(width, height, Jimp.RESIZE_BILINEAR);
      }

      // Convert to PNG buffers for pixelmatch
      const png1 = PNG.sync.read(await img1.getBufferAsync(Jimp.MIME_PNG));
      const png2 = PNG.sync.read(await img2.getBufferAsync(Jimp.MIME_PNG));

      // Compare with pixelmatch
      const diff = new PNG({ width, height });
      const numDiffPixels = pixelmatch(
        png1.data,
        png2.data,
        diff.data,
        width,
        height,
        { threshold: 0.1 }
      );

      // Calculate similarity score (0 = no match, 1 = perfect match)
      const totalPixels = width * height;
      const similarityScore = totalPixels > 0 ? 1 - (numDiffPixels / totalPixels) : 0;

      return Math.max(0, Math.min(1, similarityScore)); // Clamp between 0 and 1

    } catch (error) {
      console.error('Error comparing images:', error);
      return 0; // Return 0 on any error
    }
  }

  /**
   * Execute action on a candidate element
   * @param {Object} candidate - Candidate element with position
   * @param {Object} action - Action to execute
   * @returns {Promise<Object>} Execution result
   */
  async executeOnCandidate(candidate, action) {
    try {
      if (action.type === 'click') {
        // Click at element center position
        await this.clickAtPosition(
          candidate.position.absolute.x,
          candidate.position.absolute.y
        );
        return { success: true, method: 'visual' };
      } else if (action.type === 'type') {
        // Find element at position and type
        const elementHandle = await this.page.evaluateHandle(
          (pos) => document.elementFromPoint(pos.x, pos.y),
          candidate.position.absolute
        );
        
        const element = elementHandle.asElement();
        if (element) {
          // Support both formats for text value
          const textValue = action.text || action.params?.text || '';
          await element.type(textValue, { delay: 50 });
          return { success: true, method: 'visual' };
        }
      } else if (action.type === 'upload') {
        // Upload actions are handled at the top level in executeAction
        // This should not be reached, but handle it just in case
        return await this.handleUploadAction(action);
      }

      return { success: false, method: 'visual', error: 'Could not execute on candidate' };

    } catch (error) {
      return { success: false, method: 'visual', error: error.message };
    }
  }

  /**
   * Click at specific coordinates (position-based clicking)
   * Uses page.mouse.click(x, y) from Puppeteer
   * Adds random offset (±2 pixels) for human-like behavior
   * Adds pre-click hover (move mouse to position first)
   * Waits 100-300ms between hover and click (randomized)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Promise<Object>} Execution result
   */
  async clickAtPosition(x, y) {
    try {
      // Add random offset (±2 pixels) for human-like behavior
      const offsetX = (Math.random() * 4) - 2; // -2 to +2
      const offsetY = (Math.random() * 4) - 2; // -2 to +2
      const finalX = Math.round(x + offsetX);
      const finalY = Math.round(y + offsetY);

      // Pre-click hover: move mouse to position first
      await this.page.mouse.move(finalX, finalY);
      
      // Wait 100-300ms between hover and click (randomized)
      const hoverDelay = 100 + Math.random() * 200;
      await new Promise(resolve => setTimeout(resolve, Math.round(hoverDelay)));

      // Click using Puppeteer mouse API
      await this.page.mouse.click(finalX, finalY);

      return { success: true, method: 'position' };

    } catch (error) {
      return { success: false, method: 'position', error: error.message };
    }
  }

  /**
   * Download file from URL to temporary location
   * @param {string} url - URL to download from
   * @returns {Promise<string>} Path to downloaded file
   */
  async downloadFileFromUrl(url) {
    return new Promise((resolve, reject) => {
      try {
        // Create temp directory if it doesn't exist
        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Generate unique filename
        const urlParts = url.split('/');
        const originalFilename = urlParts[urlParts.length - 1].split('?')[0]; // Remove query params
        const ext = path.extname(originalFilename) || '.jpg';
        const filename = `download_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
        const filePath = path.join(tempDir, filename);
        
        // Determine protocol
        const isHttps = url.startsWith('https://');
        const client = isHttps ? https : http;
        
        // Download file
        const file = fs.createWriteStream(filePath);
        
        client.get(url, (response) => {
          // Handle redirects
          if (response.statusCode === 301 || response.statusCode === 302) {
            file.close();
            fs.unlinkSync(filePath);
            return this.downloadFileFromUrl(response.headers.location).then(resolve).catch(reject);
          }
          
          if (response.statusCode !== 200) {
            file.close();
            fs.unlinkSync(filePath);
            return reject(new Error(`Failed to download file: ${response.statusCode} ${response.statusMessage}`));
          }
          
          response.pipe(file);
          
          file.on('finish', () => {
            file.close();
            resolve(filePath);
          });
        }).on('error', (err) => {
          file.close();
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          reject(err);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get execution statistics
   * @returns {Object} Execution stats
   */
  getStats() {
    const total = Object.values(this.executionStats).reduce((a, b) => a + b, 0);
    return {
      ...this.executionStats,
      total,
      successRate: total > 0 ? ((total - this.executionStats.failures) / total * 100).toFixed(1) + '%' : 'N/A',
    };
  }

  /**
   * Reset execution statistics
   */
  resetStats() {
    this.executionStats = {
      selectorSuccess: 0,
      textSuccess: 0,
      visualSuccess: 0,
      positionSuccess: 0,
      failures: 0,
    };
  }

  /**
   * Enable/disable debug mode
   * @param {boolean} enabled - Debug mode enabled
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }
}
