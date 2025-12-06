/**
 * Cloudinary upload service for binary files (ZIP, EXE, etc.)
 * Uses raw upload endpoint for non-image files
 * Supports chunked upload for files larger than 10MB (Cloudinary free tier limit)
 */

import crypto from 'crypto';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

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

  console.log('[DEBUG] String to sign:', baseString);
  const signature = crypto.createHash('sha1').update(`${baseString}${apiSecret}`).digest('hex');
  console.log('[DEBUG] Generated signature:', signature);
  
  return signature;
};

/**
 * Upload a single chunk to Cloudinary
 */
async function uploadChunk(chunkBuffer, chunkIndex, totalChunks, uploadId, publicId, folder, cloudName, apiKey, apiSecret, chunkSize, fileSize) {
  const FormData = (await import('form-data')).default;
  const https = await import('https');
  const timestamp = Math.floor(Date.now() / 1000);

  // Build signature params
  const signatureParams = normalizeParams({
    folder,
    public_id: publicId,
    timestamp,
  });

  const signature = signParams(signatureParams, apiSecret);

  // Create form data
  const form = new FormData();
  form.append('file', chunkBuffer, {
    filename: `chunk_${chunkIndex}`,
    contentType: 'application/octet-stream',
  });
  form.append('api_key', apiKey);
  form.append('timestamp', timestamp);
  form.append('signature', signature);
  form.append('folder', folder);
  form.append('public_id', publicId);

  // Add chunked upload headers
  const startByte = chunkIndex * chunkSize;
  const endByte = Math.min(startByte + chunkSize - 1, fileSize - 1);
  const contentRange = `bytes ${startByte}-${endByte}/${fileSize}`;

  // Only include upload_id if not first chunk
  if (chunkIndex > 0 && uploadId) {
    form.append('upload_id', uploadId);
  }

  return new Promise((resolve, reject) => {
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`;
    const url = new URL(uploadUrl);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        'X-Unique-Upload-Id': uploadId || `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        'Content-Range': contentRange,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const result = JSON.parse(data);
            resolve(result);
          } catch (parseError) {
            reject(new Error(`Failed to parse Cloudinary response: ${parseError.message}`));
          }
        } else {
          reject(new Error(`Chunk upload failed (${res.statusCode}): ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Chunk upload request failed: ${error.message}`));
    });

    form.pipe(req);
  });
}

/**
 * Upload large binary file to Cloudinary using chunked upload
 * @param {string} filePath - Path to file to upload
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result with secure_url
 */
export async function uploadBinaryFileChunked(filePath, options = {}) {
  const { cloudName, apiKey, apiSecret } = getConfig();

  const publicId = options.public_id || path.basename(filePath, path.extname(filePath));
  const folder = options.folder || 'installers';

  // Get file size
  const stats = await fs.promises.stat(filePath);
  const fileSize = stats.size;
  const chunkSize = 6 * 1024 * 1024; // 6MB chunks (safe for free tier)
  const totalChunks = Math.ceil(fileSize / chunkSize);
  
  console.log(`[DEBUG] Starting chunked upload:`);
  console.log(`  File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Chunk size: ${(chunkSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Total chunks: ${totalChunks}`);

  // Generate unique upload ID
  const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  let uploadResult = null;

  // Open file for reading
  const fileHandle = await fs.promises.open(filePath, 'r');
  try {
    // Upload each chunk
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, fileSize);
      const bufferSize = end - start;

      // Read chunk
      const buffer = Buffer.alloc(bufferSize);
      const { bytesRead } = await fileHandle.read(buffer, 0, bufferSize, start);
      
      if (bytesRead !== bufferSize) {
        throw new Error(`Failed to read full chunk. Expected ${bufferSize} bytes, got ${bytesRead}`);
      }

      console.log(`[DEBUG] Uploading chunk ${i + 1}/${totalChunks} (${(bufferSize / 1024 / 1024).toFixed(2)} MB)...`);

      // Upload chunk
      uploadResult = await uploadChunk(
        buffer,
        i,
        totalChunks,
        uploadId,
        publicId,
        folder,
        cloudName,
        apiKey,
        apiSecret,
        chunkSize,
        fileSize
      );

      console.log(`[DEBUG] Chunk ${i + 1}/${totalChunks} uploaded successfully`);
    }

    await fileHandle.close();

    if (!uploadResult || !uploadResult.secure_url) {
      throw new Error('Upload completed but no URL returned');
    }

    console.log('[DEBUG] Chunked upload completed successfully');
    console.log('[DEBUG] URL:', uploadResult.secure_url);

    return {
      secure_url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      url: uploadResult.url,
      ...uploadResult,
    };
  } catch (error) {
    await fileHandle.close();
    throw error;
  }
}

/**
 * Upload binary file (ZIP, EXE, etc.) to Cloudinary - automatically chooses chunked or direct upload
 * @param {string} filePath - Path to file to upload
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result with secure_url
 */
export async function uploadBinaryFile(filePath, options = {}) {
  const stats = await fs.promises.stat(filePath);
  const fileSize = stats.size;
  const sizeMB = fileSize / 1024 / 1024;

  // Use chunked upload for files larger than 8MB (to stay under 10MB free tier limit)
  if (sizeMB > 8) {
    console.log(`[DEBUG] File is ${sizeMB.toFixed(2)}MB, using chunked upload`);
    return uploadBinaryFileChunked(filePath, options);
  }

  // For smaller files, use direct upload
  console.log(`[DEBUG] File is ${sizeMB.toFixed(2)}MB, using direct upload`);

  const { cloudName, apiKey, apiSecret } = getConfig();
  const timestamp = Math.floor(Date.now() / 1000);

  // Build params for signature - DO NOT include resource_type
  const signatureParams = normalizeParams({
    folder: options.folder || 'installers',
    public_id: options.public_id || path.basename(filePath, path.extname(filePath)),
    timestamp,
  });

  const signature = signParams(signatureParams, apiSecret);

  // Create form data
  const FormData = (await import('form-data')).default;
  const https = await import('https');
  const form = new FormData();

  // Append fields - resource_type goes in form but NOT in signature
  form.append('file', fs.createReadStream(filePath));
  form.append('api_key', apiKey);
  form.append('timestamp', signatureParams.timestamp);
  form.append('signature', signature);
  form.append('folder', signatureParams.folder);
  form.append('public_id', signatureParams.public_id);

  // Upload to Cloudinary using https module
  return new Promise((resolve, reject) => {
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`;
    const url = new URL(uploadUrl);

    const requestOptions = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: form.getHeaders(),
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const result = JSON.parse(data);
            resolve({
              secure_url: result.secure_url,
              public_id: result.public_id,
              url: result.url,
              ...result,
            });
          } catch (parseError) {
            reject(new Error(`Failed to parse Cloudinary response: ${parseError.message}`));
          }
        } else {
          reject(new Error(`Cloudinary upload failed (${res.statusCode}): ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Cloudinary upload request failed: ${error.message}`));
    });

    form.pipe(req);
  });
}