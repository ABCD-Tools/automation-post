/**
 * Supabase Storage service for installer files
 * Handles upload, download, and deletion of installer files
 */

import { createSupabaseServiceRoleClient } from '@modules-view/utils/supabase';
import fs from 'fs/promises';
import path from 'path';

const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'installers';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB (Supabase free tier limit)

/**
 * Upload installer file to Supabase Storage
 * @param {string} filePath - Path to file to upload
 * @param {Object} options - Upload options
 * @param {string} options.userId - User ID for organizing files
 * @param {string} options.downloadToken - Download token for unique filename
 * @returns {Promise<Object>} Upload result with publicUrl
 */
export async function uploadInstaller(filePath, options = {}) {
  const { userId, downloadToken } = options;

  if (!userId) {
    throw new Error('userId is required for installer upload');
  }

  if (!downloadToken) {
    throw new Error('downloadToken is required for installer upload');
  }

  // Check file size
  const stats = await fs.stat(filePath);
  const fileSize = stats.size;
  const sizeMB = fileSize / 1024 / 1024;

  console.log(`[DEBUG] Uploading installer to Supabase Storage:`);
  console.log(`  File size: ${sizeMB.toFixed(2)} MB`);
  console.log(`  User ID: ${userId}`);
  console.log(`  Download token: ${downloadToken}`);

  if (fileSize > MAX_FILE_SIZE) {
    throw new Error(
      `File size (${sizeMB.toFixed(2)} MB) exceeds maximum allowed size (50 MB). Please reduce installer size.`
    );
  }

  // Read file to buffer
  const fileBuffer = await fs.readFile(filePath);
  const fileName = `installer_${downloadToken}${path.extname(filePath)}`;
  const filePathInBucket = `${userId}/${fileName}`;

  // Get Supabase client with service role (bypasses RLS)
  const supabase = createSupabaseServiceRoleClient();

  // Determine content type based on file extension
  const ext = path.extname(filePath).toLowerCase();
  const contentType = ext === '.exe' 
    ? 'application/x-msdownload' 
    : ext === '.zip'
    ? 'application/zip'
    : 'application/octet-stream';

  // Upload file to Supabase Storage
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePathInBucket, fileBuffer, {
      contentType,
      upsert: false, // Don't overwrite existing files
      cacheControl: '3600', // Cache for 1 hour
    });

  if (error) {
    console.error('[DEBUG] Supabase Storage upload error:', error);
    throw new Error(`Failed to upload installer to Supabase Storage: ${error.message}`);
  }

  console.log('[DEBUG] File uploaded successfully:', data.path);

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePathInBucket);

  if (!urlData?.publicUrl) {
    throw new Error('Failed to get public URL for uploaded file');
  }

  const publicUrl = urlData.publicUrl;

  console.log('[DEBUG] Public download URL:', publicUrl);

  return {
    publicUrl,
    path: filePathInBucket,
    fileName,
    size: fileSize,
  };
}

/**
 * Delete installer file from Supabase Storage
 * @param {string} filePath - Path to file in bucket (e.g., "userId/installer_token.zip")
 * @returns {Promise<boolean>} True if deleted successfully
 */
export async function deleteInstaller(filePath) {
  const supabase = createSupabaseServiceRoleClient();

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath]);

  if (error) {
    console.error('[DEBUG] Failed to delete installer:', error);
    return false;
  }

  console.log('[DEBUG] Deleted installer:', filePath);
  return true;
}

/**
 * Get public URL for installer file
 * @param {string} filePath - Path to file in bucket
 * @returns {string} Public download URL
 */
export function getInstallerUrl(filePath) {
  const supabase = createSupabaseServiceRoleClient();

  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return data?.publicUrl || null;
}

/**
 * List installer files for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} List of installer files
 */
export async function listUserInstallers(userId) {
  const supabase = createSupabaseServiceRoleClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(userId, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (error) {
    console.error('[DEBUG] Failed to list installers:', error);
    return [];
  }

  return data || [];
}

