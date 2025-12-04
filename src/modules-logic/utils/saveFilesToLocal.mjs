import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Save Files To Local - Utility to extract and save screenshots from recordings to local files
 * 
 * This utility:
 * - Extracts screenshots from recording data (base64 data URLs)
 * - Saves screenshots as PNG files to a local directory
 * - Replaces base64 data with file paths in the recording data
 * - Handles both recordedActions and microActions formats
 * 
 * @module saveFilesToLocal
 */

/**
 * Extract base64 data from data URL
 * @param {string} dataUrl - Base64 data URL (e.g., "data:image/png;base64,...")
 * @returns {string|null} Base64 string without prefix, or null if invalid
 */
function extractBase64(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return null;
  }

  // Check if it's a data URL
  if (!dataUrl.startsWith('data:image/')) {
    return null;
  }

  // Extract base64 part
  const base64Match = dataUrl.match(/^data:image\/\w+;base64,(.+)$/);
  if (!base64Match || !base64Match[1]) {
    return null;
  }

  return base64Match[1];
}

/**
 * Save a single screenshot to a local file
 * @param {string} base64Data - Base64 encoded image data
 * @param {string} filePath - Full path where to save the file
 * @returns {Promise<string>} File path if successful, null if failed
 */
async function saveScreenshotToFile(base64Data, filePath) {
  try {
    if (!base64Data) {
      return null;
    }

    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // Convert base64 to buffer and write to file
    const buffer = Buffer.from(base64Data, 'base64');
    await fs.writeFile(filePath, buffer);

    return filePath;
  } catch (error) {
    console.error(`Error saving screenshot to ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Generate a unique filename for a screenshot
 * @param {string} recordingId - Recording session ID or filename
 * @param {number} actionIndex - Index of the action
 * @param {string} type - Type of screenshot ('screenshot' or 'contextScreenshot')
 * @returns {string} Filename
 */
function generateScreenshotFilename(recordingId, actionIndex, type = 'screenshot') {
  const sanitizedId = recordingId.replace(/[^a-zA-Z0-9-_]/g, '_');
  const suffix = type === 'contextScreenshot' ? '_context' : '';
  return `screenshot_${sanitizedId}_action${actionIndex}${suffix}.png`;
}

/**
 * Save screenshots from a single action to local files
 * @param {Object} action - Action object with visual data
 * @param {number} actionIndex - Index of the action
 * @param {string} screenshotsDir - Directory to save screenshots
 * @param {string} recordingId - Recording ID for filename generation
 * @returns {Promise<Object>} Updated action with file paths instead of base64
 */
async function saveActionScreenshots(action, actionIndex, screenshotsDir, recordingId) {
  const updatedAction = { ...action };
  let savedCount = 0;

  // Handle different action formats
  let visualData = null;
  if (action.visual) {
    // New format: visual at top level
    visualData = action.visual;
    updatedAction.visual = { ...action.visual };
  } else if (action.params?.visual) {
    // Old format: visual in params
    visualData = action.params.visual;
    updatedAction.params = { ...action.params };
    updatedAction.params.visual = { ...action.params.visual };
  }

  if (!visualData) {
    return { action: updatedAction, savedCount: 0 };
  }

  // Save screenshot
  if (visualData.screenshot) {
    const base64Data = extractBase64(visualData.screenshot);
    if (base64Data) {
      const filename = generateScreenshotFilename(recordingId, actionIndex, 'screenshot');
      const filePath = path.join(screenshotsDir, filename);
      const savedPath = await saveScreenshotToFile(base64Data, filePath);
      
      if (savedPath) {
        // Replace base64 with relative file path
        // Note: baseDir will be passed from the parent function context
        // For now, calculate relative to screenshotsDir parent's parent (recordings dir)
        const recordingsDir = path.dirname(path.dirname(screenshotsDir));
        const relativePath = path.relative(recordingsDir, savedPath).replace(/\\/g, '/'); // Use forward slashes for portability
        if (action.visual) {
          updatedAction.visual.screenshot = relativePath;
        } else if (updatedAction.params?.visual) {
          updatedAction.params.visual.screenshot = relativePath;
        }
        savedCount++;
      }
    }
  }

  // Save contextScreenshot
  if (visualData.contextScreenshot) {
    const base64Data = extractBase64(visualData.contextScreenshot);
    if (base64Data) {
      const filename = generateScreenshotFilename(recordingId, actionIndex, 'contextScreenshot');
      const filePath = path.join(screenshotsDir, filename);
      const savedPath = await saveScreenshotToFile(base64Data, filePath);
      
      if (savedPath) {
        // Replace base64 with relative file path
        // Note: baseDir will be passed from the parent function context
        // For now, calculate relative to screenshotsDir parent's parent (recordings dir)
        const recordingsDir = path.dirname(path.dirname(screenshotsDir));
        const relativePath = path.relative(recordingsDir, savedPath).replace(/\\/g, '/'); // Use forward slashes for portability
        if (action.visual) {
          updatedAction.visual.contextScreenshot = relativePath;
        } else if (updatedAction.params?.visual) {
          updatedAction.params.visual.contextScreenshot = relativePath;
        }
        savedCount++;
      }
    }
  }

  return { action: updatedAction, savedCount };
}

/**
 * Save all screenshots from recording data to local files
 * @param {Object} recordingData - Recording data object
 * @param {Object} options - Options
 * @param {string} options.outputDir - Directory to save screenshots (default: recordings/screenshots)
 * @param {boolean} options.updateRecording - Whether to update recording data with file paths (default: true)
 * @param {boolean} options.processRecordedActions - Process recordedActions array (default: true)
 * @param {boolean} options.processMicroActions - Process microActions array (default: true)
 * @returns {Promise<Object>} Result object with saved files info and updated recording data
 */
export async function saveFilesToLocal(recordingData, options = {}) {
  const {
    outputDir = path.join(process.cwd(), 'recordings', 'screenshots'),
    updateRecording = true,
    processRecordedActions = true,
    processMicroActions = true,
  } = options;

  // Get recording ID for filename generation
  const recordingId = recordingData.sessionId || 
                     recordingData.timestamp?.replace(/[:.]/g, '-') || 
                     `recording_${Date.now()}`;

  // Create screenshots directory
  const screenshotsDir = path.join(outputDir, recordingId);
  await fs.mkdir(screenshotsDir, { recursive: true });

  // Calculate base directory for relative paths (recordings directory)
  // outputDir is typically 'recordings/screenshots', so baseDir is 'recordings'
  const baseDir = path.dirname(outputDir);

  const result = {
    screenshotsDir,
    baseDir,
    savedFiles: [],
    totalSaved: 0,
    updatedRecordingData: updateRecording ? { ...recordingData } : recordingData,
    errors: [],
  };

  // Process recordedActions
  if (processRecordedActions && recordingData.recordedActions) {
    const updatedActions = [];
    
    for (let i = 0; i < recordingData.recordedActions.length; i++) {
      const action = recordingData.recordedActions[i];
      try {
        const { action: updatedAction, savedCount } = await saveActionScreenshots(
          action,
          i,
          screenshotsDir,
          recordingId
        );
        
        updatedActions.push(updatedAction);
        result.totalSaved += savedCount;
        
        if (savedCount > 0) {
          result.savedFiles.push({
            actionIndex: i,
            actionType: action.type,
            savedCount,
          });
        }
      } catch (error) {
        result.errors.push({
          actionIndex: i,
          error: error.message,
        });
        updatedActions.push(action); // Keep original on error
      }
    }

    if (updateRecording) {
      result.updatedRecordingData.recordedActions = updatedActions;
    }
  }

  // Process microActions
  if (processMicroActions && recordingData.microActions) {
    const updatedActions = [];
    
    for (let i = 0; i < recordingData.microActions.length; i++) {
      const action = recordingData.microActions[i];
      try {
        const { action: updatedAction, savedCount } = await saveActionScreenshots(
          action,
          i,
          screenshotsDir,
          recordingId
        );
        
        updatedActions.push(updatedAction);
        result.totalSaved += savedCount;
        
        if (savedCount > 0) {
          result.savedFiles.push({
            actionIndex: i,
            actionType: action.type,
            actionName: action.name,
            savedCount,
            isMicroAction: true,
          });
        }
      } catch (error) {
        result.errors.push({
          actionIndex: i,
          isMicroAction: true,
          error: error.message,
        });
        updatedActions.push(action); // Keep original on error
      }
    }

    if (updateRecording) {
      result.updatedRecordingData.microActions = updatedActions;
    }
  }

  return result;
}

/**
 * Save screenshots from a single recording file
 * @param {string} recordingFilePath - Path to recording JSON file
 * @param {Object} options - Options (same as saveFilesToLocal)
 * @returns {Promise<Object>} Result object
 */
export async function saveFilesFromRecordingFile(recordingFilePath, options = {}) {
  try {
    // Read recording file
    const fileContent = await fs.readFile(recordingFilePath, 'utf-8');
    const recordingData = JSON.parse(fileContent);

    // Save screenshots
    const result = await saveFilesToLocal(recordingData, options);

    // Optionally update the recording file
    if (options.updateRecordingFile && result.updatedRecordingData) {
      await fs.writeFile(
        recordingFilePath,
        JSON.stringify(result.updatedRecordingData, null, 2),
        'utf-8'
      );
      result.recordingFileUpdated = true;
    }

    return result;
  } catch (error) {
    throw new Error(`Error processing recording file ${recordingFilePath}: ${error.message}`);
  }
}

