import crypto from 'crypto';

const getConfig = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName) {
    throw new Error('Missing Cloudinary environment variable: CLOUDINARY_CLOUD_NAME');
  }
  if (!apiKey) {
    throw new Error('Missing Cloudinary environment variable: CLOUDINARY_API_KEY');
  }
  if (!apiSecret) {
    throw new Error('Missing Cloudinary environment variable: CLOUDINARY_API_SECRET');
  }

  // Trim whitespace from credentials (common issue with .env files)
  return { 
    cloudName: cloudName.trim(), 
    apiKey: apiKey.trim(), 
    apiSecret: apiSecret.trim() 
  };
};

const normalizeParams = (params) => {
  return Object.entries(params).reduce((acc, [key, value]) => {
    if (value === undefined || value === null || value === '') {
      return acc;
    }
    if (typeof value === 'object') {
      acc[key] = JSON.stringify(value);
      return acc;
    }
    acc[key] = String(value);
    return acc;
  }, {});
};

const signParams = (params, apiSecret) => {
  const baseString = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return crypto.createHash('sha1').update(`${baseString}${apiSecret}`).digest('hex');
};

/**
 * Minimal Cloudinary upload helper that avoids the deprecated `cloudinary` SDK.
 * `file` can be a remote URL, data URI, or base64 string supported by Cloudinary.
 */
export const uploadImage = async (file, options = {}) => {
  const { cloudName, apiKey, apiSecret } = getConfig();
  
  // Verify API secret is loaded (don't log the actual secret)
  if (!apiSecret || apiSecret.trim().length === 0) {
    throw new Error('Cloudinary API secret is empty or not set');
  }
  
  const timestamp = Math.floor(Date.now() / 1000);
  
  // Extract resource_type from options (if provided) - it should NOT be in signature
  const { resource_type, folder, ...otherOptions } = options;
  
  // Build params for signature - DO NOT include resource_type
  const signatureParams = normalizeParams({
    folder: folder || 'posts',
    ...otherOptions,
    timestamp,
  });

  // Debug logging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Cloudinary Debug] String to sign:', Object.keys(signatureParams)
      .sort()
      .map((key) => `${key}=${signatureParams[key]}`)
      .join('&'));
    console.log('[Cloudinary Debug] API Secret length:', apiSecret.length);
    console.log('[Cloudinary Debug] Cloud Name:', cloudName);
    console.log('[Cloudinary Debug] API Key:', apiKey ? `${apiKey.substring(0, 4)}...` : 'missing');
  }

  const signature = signParams(signatureParams, apiSecret);
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', apiKey);
  form.append('signature', signature);

  // Append signature params to form
  Object.entries(signatureParams).forEach(([key, value]) => {
    form.append(key, value);
  });
  
  // Append resource_type separately if provided (not in signature)
  if (resource_type) {
    form.append('resource_type', resource_type);
  }

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Cloudinary upload failed (${response.status}): ${errorBody}`);
  }

  return response.json();
};

/**
 * Temporary shim so existing imports expecting `cloudinary.v2` still work.
 * Provides the minimal { uploader: { upload } } interface.
 */
export const getCloudinary = () => ({
  uploader: {
    upload: uploadImage,
  },
});
