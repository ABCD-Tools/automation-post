import { optimizeImage, calculateImageSizeKB } from './image-optimizer.js';

/**
 * Visual Data Optimizer - Optimizes visual data in micro-action params before database storage
 * 
 * Before saving micro_actions to database:
 * - Compress all screenshots to 80% quality
 * - Resize screenshots to max 400x400px
 * - Remove EXIF data
 * - Estimate final size
 * 
 * Size Validation:
 * - Warns if single action > 100KB
 * - Errors if single action > 500KB
 * - Suggests splitting workflow if total > 5MB
 * 
 * TODO (Phase 2): Implement screenshot caching
 * - Calculate SHA-256 hash of screenshot
 * - Check if hash exists in screenshot_cache table
 * - If exists, return hash reference instead of base64
 * - If not exists, upload to Cloudinary and store hash
 * - Replace base64 with "hash:abc123..." in params
 * - See SCREENSHOT_CACHING_STRATEGY.md for full implementation plan
 * 
 * @module visual-data-optimizer
 */

/**
 * Optimize visual data in params object
 * @param {Object} params - Micro-action params object
 * @param {Object} options - Optimization options
 * @returns {Promise<Object>} Optimized params object
 */
export async function optimizeVisualData(params, options = {}) {
  if (!params || typeof params !== 'object') {
    return params;
  }

  const optimizedParams = { ...params };

  // Optimize visual.screenshot if present
  if (params.visual?.screenshot) {
    try {
      optimizedParams.visual = {
        ...params.visual,
        screenshot: await optimizeImage(params.visual.screenshot, {
          quality: options.quality || 80,
          maxWidth: options.maxWidth || 400,
          maxHeight: options.maxHeight || 400,
        }),
      };
    } catch (error) {
      console.error('Error optimizing screenshot:', error);
      // Keep original on error
    }
  }

  // Optimize visual.contextScreenshot if present
  if (params.visual?.contextScreenshot) {
    try {
      optimizedParams.visual.contextScreenshot = await optimizeImage(
        params.visual.contextScreenshot,
        {
          quality: options.quality || 80,
          maxWidth: options.maxWidth || 400,
          maxHeight: options.maxHeight || 400,
        }
      );
    } catch (error) {
      console.error('Error optimizing context screenshot:', error);
      // Keep original on error
    }
  }

  return optimizedParams;
}

/**
 * Calculate total size of visual data in params
 * @param {Object} params - Micro-action params object
 * @returns {number} Total size in KB
 */
export function calculateVisualDataSize(params) {
  if (!params || typeof params !== 'object') {
    return 0;
  }

  let totalSize = 0;

  if (params.visual?.screenshot) {
    totalSize += calculateImageSizeKB(params.visual.screenshot);
  }

  if (params.visual?.contextScreenshot) {
    totalSize += calculateImageSizeKB(params.visual.contextScreenshot);
  }

  return totalSize;
}

/**
 * Validate visual data size
 * @param {Object} params - Micro-action params object
 * @returns {Object} Validation result { valid: boolean, warnings: string[], errors: string[] }
 */
export function validateVisualDataSize(params) {
  const result = {
    valid: true,
    warnings: [],
    errors: [],
  };

  const sizeKB = calculateVisualDataSize(params);

  // Warn if single action > 100KB
  if (sizeKB > 100) {
    result.warnings.push(
      `Action size is ${sizeKB}KB (recommended: <100KB). Consider optimizing screenshots.`
    );
  }

  // Error if single action > 500KB
  if (sizeKB > 500) {
    result.valid = false;
    result.errors.push(
      `Action size is ${sizeKB}KB (max: 500KB). Please optimize or split the action.`
    );
  }

  return result;
}

/**
 * Validate total size for multiple actions
 * @param {Array} actions - Array of micro-action objects
 * @returns {Object} Validation result { valid: boolean, warnings: string[], errors: string[], totalSizeKB: number }
 */
export function validateTotalSize(actions) {
  const result = {
    valid: true,
    warnings: [],
    errors: [],
    totalSizeKB: 0,
  };

  let totalSizeKB = 0;

  for (const action of actions) {
    const sizeKB = calculateVisualDataSize(action.params);
    totalSizeKB += sizeKB;

    // Check individual action size
    const individualValidation = validateVisualDataSize(action.params);
    if (!individualValidation.valid) {
      result.valid = false;
      result.errors.push(...individualValidation.errors);
    }
    result.warnings.push(...individualValidation.warnings);
  }

  result.totalSizeKB = totalSizeKB;

  // Suggest splitting workflow if total > 5MB
  if (totalSizeKB > 5120) {
    result.warnings.push(
      `Total size is ${(totalSizeKB / 1024).toFixed(2)}MB (recommended: <5MB). Consider splitting into smaller workflows.`
    );
  }

  return result;
}

