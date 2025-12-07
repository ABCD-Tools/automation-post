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

  return { cloudName, apiKey, apiSecret };
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
  const timestamp = Math.floor(Date.now() / 1000);
  const params = normalizeParams({
    folder: 'posts',
    ...options,
    timestamp,
  });

  const signature = signParams(params, apiSecret);
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', apiKey);
  form.append('signature', signature);

  Object.entries(params).forEach(([key, value]) => {
    form.append(key, value);
  });

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
