import dotenv from 'dotenv';
dotenv.config();

/**
 * Save Files To Cloud - General file upload manager for cloud storage
 * Supports screenshots, input files, and any base64/binary data
 * @module saveFilesToCloud
 */

/**
 * Get cloud storage configuration for available providers
 * @param {string} provider - Cloud provider name
 * @returns {Object|null} Configuration object or null if not configured
 */
export function getCloudStorageConfig(provider) {
  const configs = {
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
    },
    s3: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
      bucket: process.env.AWS_S3_BUCKET,
    },
    supabase: {
      url: process.env.SUPABASE_URL,
      key: process.env.SUPABASE_ANON_KEY,
      bucket: process.env.SUPABASE_STORAGE_BUCKET || 'uploads',
    },
  };

  return configs[provider] || null;
}

/**
 * Check if cloud storage provider is configured
 * @param {string} provider - Provider name
 * @returns {boolean} True if configured
 */
function isProviderConfigured(provider) {
  const config = getCloudStorageConfig(provider);
  if (!config) return false;

  switch (provider) {
    case 'cloudinary':
      return !!(config.cloudName && config.apiKey && config.apiSecret);
    case 's3':
      return !!(config.accessKeyId && config.secretAccessKey && config.bucket);
    case 'supabase':
      return !!(config.url && config.key && config.bucket);
    default:
      return false;
  }
}

/**
 * Get first available configured provider with fallback
 * @param {string} preferredProvider - Preferred provider
 * @returns {Promise<{provider: string, uploader: Function}>} Provider info with upload function
 */
async function getAvailableProvider(preferredProvider = 'cloudinary') {
  const providers = ['cloudinary', 's3', 'supabase'];

  // Try preferred provider first
  if (isProviderConfigured(preferredProvider)) {
    const uploader = await loadProviderUploader(preferredProvider);
    if (uploader) {
      return { provider: preferredProvider, uploader };
    }
  }

  // Fallback to any configured provider
  for (const provider of providers) {
    if (isProviderConfigured(provider)) {
      const uploader = await loadProviderUploader(provider);
      if (uploader) {
        console.log(`📦 Using fallback provider: ${provider}`);
        return { provider, uploader };
      }
    }
  }

  throw new Error('No cloud storage provider configured. Set environment variables for cloudinary, s3, or supabase.');
}

/**
 * Dynamically import provider-specific upload function
 * @param {string} provider - Provider name
 * @returns {Promise<Function>} Upload function
 */
async function loadProviderUploader(provider) {
  try {
    switch (provider) {
      case 'cloudinary': {
        const { uploadImage } = await import('../services/cloudinary.js');
        return uploadImage;
      }
      case 's3': {
        const { uploadToS3 } = await import('../services/s3.js');
        return uploadToS3;
      }
      case 'supabase': {
        const { uploadToSupabase } = await import('../services/supabase.js');
        return uploadToSupabase;
      }
      default:
        return null;
    }
  } catch (error) {
    console.warn(`⚠️ Failed to load ${provider} uploader:`, error.message);
    return null;
  }
}

/**
 * Save files from recording data to cloud storage
 * @param {Object} recordingData - Data containing files to upload (actions, screenshots, input files, etc.)
 * @param {Object} options - Configuration options
 * @param {string} options.provider - Preferred cloud provider (default: 'cloudinary')
 * @param {string} options.folder - Base folder path (default: 'uploads')
 * @param {string} options.subfolder - Subfolder/recordingId for organization (optional)
 * @param {Function} options.getFilename - Custom filename generator: (action, index, type) => string
 * @param {boolean} options.skipIfExists - Skip if file is already a URL (default: true)
 * @param {boolean} options.keepBase64OnError - Keep base64 if upload fails (default: true)
 * @param {Array<string>} options.fileFields - Fields to check for files (default: ['screenshot', 'contextScreenshot', 'file', 'image'])
 * @returns {Promise<Object>} Result with uploadedCount and updatedRecordingData
 */
export async function saveFilesToCloud(recordingData, options = {}) {
  const {
    provider: preferredProvider = 'cloudinary',
    folder = 'uploads',
    subfolder = null,
    getFilename = null,
    skipIfExists = true,
    keepBase64OnError = true,
    fileFields = ['screenshot', 'contextScreenshot', 'file', 'image', 'data'],
  } = options;

  // Get available provider with fallback
  const { provider, uploader } = await getAvailableProvider(preferredProvider);

  // Determine full folder path
  const fullFolder = subfolder ? `${folder}/${subfolder}` : folder;

  const result = {
    uploadedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    provider,
    updatedRecordingData: { ...recordingData },
  };

  // Helper: Check if value is already a URL
  const isUrl = (str) => str?.startsWith('http://') || str?.startsWith('https://');

  // Helper: Extract base64 from data URL
  const extractBase64 = (dataUrl) => {
    if (!dataUrl || typeof dataUrl !== 'string') return null;
    if (isUrl(dataUrl)) return null;
    if (!dataUrl.startsWith('data:')) return null;
    const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
    return match?.[1] || null;
  };

  // Helper: Upload single file
  const singleUpload = async (fileData, filename) => {
    if (!fileData) return null;

    // Skip if already uploaded
    if (skipIfExists && isUrl(fileData)) {
      result.skippedCount++;
      return fileData;
    }

    try {
      // Prepare data for upload (handle base64, data URI, Buffer, etc.)
      let uploadData = fileData;

      // If it's base64 string, convert to data URI
      if (typeof fileData === 'string' && !fileData.startsWith('data:')) {
        const base64String = extractBase64(fileData) || fileData;
        uploadData = `data:image/png;base64,${base64String}`;
      }

      // Upload using provider's uploader
      const uploadResult = await uploader(uploadData, {
        folder: fullFolder,
        public_id: `${fullFolder}/${filename}`,
      });

      result.uploadedCount++;
      return uploadResult.secure_url || uploadResult.url;

    } catch (error) {
      console.warn(`⚠️ Failed to upload ${filename}:`, error.message);
      result.errorCount++;
      return keepBase64OnError ? fileData : null;
    }
  };

  // Helper: Batch upload multiple files
  const batchUpload = async (files) => {
    const results = [];
    for (const file of files) {
      const url = await singleUpload(file.data, file.filename);
      results.push({ filename: file.filename, url, success: !!url });
    }
    return results;
  };

  // Helper: Generate filename
  const generateFilename = (action, index, fieldName) => {
    // Use custom generator if provided
    if (getFilename) {
      return getFilename(action, index, fieldName);
    }
    // Default: action{index}_{fieldName}
    return `action${index}_${fieldName}`;
  };

  // Helper: Process files in action
  const processAction = async (action, index) => {
    const updatedAction = { ...action };

    // Handle visual data (for screenshots)
    let visualData = action.visual || action.params?.visual;
    if (visualData) {
      const newVisual = { ...visualData };

      // Check all possible file fields
      for (const field of fileFields) {
        if (visualData[field]) {
          const filename = generateFilename(action, index, field);
          const url = await singleUpload(visualData[field], filename);
          if (url) newVisual[field] = url;
        }
      }

      // Update action with new visual data
      if (action.visual) {
        updatedAction.visual = newVisual;
      } else if (action.params?.visual) {
        updatedAction.params = { ...action.params, visual: newVisual };
      }
    }

    // Handle direct file fields on action (for input file uploads)
    for (const field of fileFields) {
      if (action[field]) {
        const filename = generateFilename(action, index, field);
        const url = await singleUpload(action[field], filename);
        if (url) updatedAction[field] = url;
      }
    }

    // Handle params-level file fields
    if (action.params) {
      const newParams = { ...action.params };
      for (const field of fileFields) {
        if (action.params[field] && field !== 'visual') {
          const filename = generateFilename(action, index, field);
          const url = await singleUpload(action.params[field], filename);
          if (url) newParams[field] = url;
        }
      }
      updatedAction.params = newParams;
    }

    return updatedAction;
  };

  // Process recordedActions
  if (recordingData.recordedActions?.length > 0) {
    const updatedActions = [];
    for (let i = 0; i < recordingData.recordedActions.length; i++) {
      const updated = await processAction(recordingData.recordedActions[i], i);
      updatedActions.push(updated);
    }
    result.updatedRecordingData.recordedActions = updatedActions;
  }

  // Process microActions
  if (recordingData.microActions?.length > 0) {
    const updatedActions = [];
    for (let i = 0; i < recordingData.microActions.length; i++) {
      const updated = await processAction(recordingData.microActions[i], i);
      updatedActions.push(updated);
    }
    result.updatedRecordingData.microActions = updatedActions;
  }

  return result;
}