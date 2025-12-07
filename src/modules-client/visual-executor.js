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

      // Wait for element to exist (with timeout)
      await this.page.waitForSelector(selector, { timeout, visible: true }).catch(() => null);

      // Check if element exists
      const element = await this.page.$(selector);
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
        // Handle file upload - use setInputFiles instead of clicking
        // Check multiple locations for filePath (top level, params, or imagePath alias)
        const filePath = action.filePath || action.params?.filePath || action.params?.imagePath || action.imagePath || '';
        if (!filePath) {
          return { success: false, method: 'selector', error: 'No filePath provided for upload action' };
        }
        
        // Check if filePath is a URL (starts with http:// or https://)
        let localFilePath = filePath;
        if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
          // Download file from URL to temporary location
          localFilePath = await this.downloadFileFromUrl(filePath);
        }
        
        // Verify file exists
        if (!fs.existsSync(localFilePath)) {
          return { success: false, method: 'selector', error: `File not found: ${localFilePath}` };
        }
        
        // Use setInputFiles to set the file directly (avoids opening file picker)
        await element.setInputFiles(localFilePath);
        
        // Clean up temporary file if it was downloaded
        if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
          // Don't delete immediately - wait a bit in case upload is still processing
          setTimeout(() => {
            try {
              if (fs.existsSync(localFilePath)) {
                fs.unlinkSync(localFilePath);
              }
            } catch (err) {
              // Ignore cleanup errors
            }
          }, 5000);
        }
        
        return { success: true, method: 'selector' };
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
   * @param {string} text - Text to search for
   * @returns {Promise<Array>} Array of matches with positions
   */
  async findByText(text) {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const candidates = await this.page.evaluate((searchText) => {
      const results = [];
      
      // Search all text nodes and their parent elements
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      let textNode;
      const processedElements = new Set();

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
      const allElements = document.querySelectorAll('*');
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
        // Handle file upload - find file input element and use setInputFiles
        const elementHandle = await this.page.evaluateHandle(
          (pos) => document.elementFromPoint(pos.x, pos.y),
          candidate.position.absolute
        );
        
        const element = elementHandle.asElement();
        if (!element) {
          return { success: false, method: 'visual', error: 'Could not find element at position' };
        }
        
        // Verify it's a file input
        const tagName = await element.evaluate(el => el.tagName);
        const inputType = await element.evaluate(el => el.type || '');
        if (tagName !== 'INPUT' || inputType !== 'file') {
          // Try to find a file input nearby
          const fileInput = await this.page.evaluateHandle(
            (pos) => {
              const element = document.elementFromPoint(pos.x, pos.y);
              if (!element) return null;
              
              // Check if element itself is a file input
              if (element.tagName === 'INPUT' && element.type === 'file') {
                return element;
              }
              
              // Check parent elements
              let parent = element.parentElement;
              for (let i = 0; i < 3 && parent; i++) {
                if (parent.tagName === 'INPUT' && parent.type === 'file') {
                  return parent;
                }
                parent = parent.parentElement;
              }
              
              // Search for file input in the same container
              const container = element.closest('form, div, section');
              if (container) {
                const fileInputs = container.querySelectorAll('input[type="file"]');
                if (fileInputs.length > 0) {
                  return fileInputs[0];
                }
              }
              
              return null;
            },
            candidate.position.absolute
          );
          
          if (fileInput && fileInput.asElement()) {
            // Check multiple locations for filePath (top level, params, or imagePath alias)
            const filePath = action.filePath || action.params?.filePath || action.params?.imagePath || action.imagePath || '';
            if (!filePath) {
              return { success: false, method: 'visual', error: 'No filePath provided for upload action' };
            }
            
            // Check if filePath is a URL (starts with http:// or https://)
            let localFilePath = filePath;
            if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
              // Download file from URL to temporary location
              localFilePath = await this.downloadFileFromUrl(filePath);
            }
            
            // Verify file exists
            if (!fs.existsSync(localFilePath)) {
              return { success: false, method: 'visual', error: `File not found: ${localFilePath}` };
            }
            
            // Use setInputFiles to set the file directly (avoids opening file picker)
            await fileInput.asElement().setInputFiles(localFilePath);
            
            // Clean up temporary file if it was downloaded
            if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
              // Don't delete immediately - wait a bit in case upload is still processing
              setTimeout(() => {
                try {
                  if (fs.existsSync(localFilePath)) {
                    fs.unlinkSync(localFilePath);
                  }
                } catch (err) {
                  // Ignore cleanup errors
                }
              }, 5000);
            }
            
            return { success: true, method: 'visual' };
          } else {
            return { success: false, method: 'visual', error: 'Could not find file input element' };
          }
        } else {
          // Element is already a file input
          // Check multiple locations for filePath (top level, params, or imagePath alias)
          const filePath = action.filePath || action.params?.filePath || action.params?.imagePath || action.imagePath || '';
          if (!filePath) {
            return { success: false, method: 'visual', error: 'No filePath provided for upload action' };
          }
          
          // Check if filePath is a URL (starts with http:// or https://)
          let localFilePath = filePath;
          if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
            // Download file from URL to temporary location
            localFilePath = await this.downloadFileFromUrl(filePath);
          }
          
          // Verify file exists
          if (!fs.existsSync(localFilePath)) {
            return { success: false, method: 'visual', error: `File not found: ${localFilePath}` };
          }
          
          // Use setInputFiles to set the file directly (avoids opening file picker)
          await element.setInputFiles(localFilePath);
          
          // Clean up temporary file if it was downloaded
          if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
            // Don't delete immediately - wait a bit in case upload is still processing
            setTimeout(() => {
              try {
                if (fs.existsSync(localFilePath)) {
                  fs.unlinkSync(localFilePath);
                }
              } catch (err) {
                // Ignore cleanup errors
              }
            }, 5000);
          }
          
          return { success: true, method: 'visual' };
        }
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
