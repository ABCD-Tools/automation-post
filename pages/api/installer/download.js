import { authenticateRequest } from '@modules-logic/middleware/auth';
import { buildInstaller } from '@modules-installer/builder.mjs';
import { buildDeveloperZip } from '@modules-installer/developer-zip-builder.mjs';
import { createSupabaseServiceRoleClient } from '@modules-view/utils/supabase';
import { uploadInstaller } from '@modules-logic/services/supabase-storage';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

/**
 * Installer Download API
 * 
 * Generates and serves installer download
 * 
 * POST /api/installer/download
 * Body: {
 *   installPath: string,
 *   browserPath: string,
 *   encryptionKey: string,
 *   decryptionKey: string
 * }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Debug: Log request headers
  console.log('[DEBUG] Installer download request:');
  console.log('  Method:', req.method);
  console.log('  Headers:', {
    authorization: req.headers.authorization ? 'Bearer ***' : 'MISSING',
    'content-type': req.headers['content-type'],
    'user-agent': req.headers['user-agent'],
  });
  console.log('  All headers keys:', Object.keys(req.headers));

  try {
    // Authenticate user
    console.log('[DEBUG] Attempting authentication...');
    const user = await authenticateRequest(req);
    console.log('[DEBUG] Authentication successful. User ID:', user?.id);
    
    if (!user || !user.id) {
      console.log('[DEBUG] Authentication failed: No user or user.id');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user config from request body
    const {
      installPath,
      browserPath,
      encryptionKey,
      decryptionKey,
      debugMode, // If true, build developer ZIP instead of installer
    } = req.body;

    // Validate required fields
    if (!installPath || !browserPath || !encryptionKey || !decryptionKey) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['installPath', 'browserPath', 'encryptionKey', 'decryptionKey'],
      });
    }

    // Validate encryption keys (must be RSA keys in PEM format)
    // ENCRYPTION_KEY should be a public key, DECRYPTION_KEY should be a private key
    if (!encryptionKey.includes('-----BEGIN PUBLIC KEY-----') || !decryptionKey.includes('-----BEGIN PRIVATE KEY-----')) {
      return res.status(400).json({
        error: 'Encryption keys must be RSA keys in PEM format. ENCRYPTION_KEY should be a public key, DECRYPTION_KEY should be a private key.',
      });
    }

    // Generate clientId and downloadToken
    const clientId = `client_${uuidv4().replace(/-/g, '')}`;
    const downloadToken = uuidv4();

    // Get API endpoint from request
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const apiEndpoint = `${protocol}://${host}/api/client`;

    // Generate API token (in production, use proper token generation)
    const apiToken = `sk_${crypto.randomBytes(32).toString('hex')}`;

    // Hash encryption key for storage (don't store plain keys)
    const encryptionKeyHash = crypto
      .createHash('sha256')
      .update(encryptionKey)
      .digest('hex');

    // Save to installer_downloads table
    // Note: client_id is NOT set here - it will be set when the client registers after installation
    const supabase = createSupabaseServiceRoleClient();
    const { data: downloadRecord, error: dbError } = await supabase
      .from('installer_downloads')
      .insert({
        user_id: user.id,
        download_token: downloadToken,
        install_path: installPath,
        browser_path: browserPath,
        encryption_key_hash: encryptionKeyHash,
        // client_id is NULL initially - will be set when client registers
        client_id: null,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        metadata: {
          userAgent: req.headers['user-agent'],
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          clientId: clientId, // Store in metadata for reference, but don't set as FK yet
          encryptionKey: encryptionKey, // Store encryption key for later retrieval (encrypted)
          decryptionKey: decryptionKey, // Store decryption key for later retrieval (encrypted)
        },
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({ error: 'Failed to create download record' });
    }

    // Build installer or developer ZIP based on debug mode
    let buildResult;
    if (debugMode === true) {
      console.log('Building developer ZIP for user:', user.id);
      console.log('[DEBUG] Download token for developer ZIP:', downloadToken ? 'Present' : 'Missing');
      buildResult = await buildDeveloperZip({
        apiEndpoint,
        apiToken,
        clientId,
        encryptionKey,
        decryptionKey,
        browserPath,
        installPath,
        downloadToken,
      });
    } else {
      console.log('Building installer for user:', user.id);
      buildResult = await buildInstaller({
        userId: user.id,
        apiToken,
        apiEndpoint,
        installPath,
        browserPath,
        encryptionKey,
        decryptionKey,
        clientId,
        downloadToken,
      });
    }

    if (!buildResult.success) {
      // Update status to failed
      await supabase
        .from('installer_downloads')
        .update({ status: 'failed' })
        .eq('id', downloadRecord.id);

      return res.status(500).json({
        error: 'Failed to build installer',
        message: buildResult.message || 'Installer build failed',
      });
    }

    // Read installer file (handle both regular installer and developer ZIP)
    const installerPath = buildResult.installerPath || buildResult.zipPath;
    if (!installerPath) {
      throw new Error('Installer path not found in build result');
    }
    const installerSize = (await fs.stat(installerPath)).size;
    const sizeMB = installerSize / 1024 / 1024;
    
    console.log(`[DEBUG] Installer file size: ${sizeMB.toFixed(2)} MB`);

    // Check file size before upload (Supabase limit is 50MB)
    if (installerSize > 50 * 1024 * 1024) {
      // Update status to failed
      await supabase
        .from('installer_downloads')
        .update({ status: 'failed' })
        .eq('id', downloadRecord.id);

      return res.status(400).json({
        error: 'Installer file too large',
        message: `Installer file (${sizeMB.toFixed(2)} MB) exceeds maximum allowed size (50 MB). Please reduce installer size.`,
        fileSizeMB: sizeMB.toFixed(2),
        maxSizeMB: 50,
      });
    }

    // Upload to Supabase Storage
    console.log('[DEBUG] Uploading installer to Supabase Storage...');
    let downloadUrl;
    let storagePath;
    try {
      const uploadResult = await uploadInstaller(installerPath, {
        userId: user.id,
        downloadToken,
      });
      
      downloadUrl = uploadResult.publicUrl;
      storagePath = uploadResult.path;
      console.log('[DEBUG] Upload successful. URL:', downloadUrl);
    } catch (uploadError) {
      console.error('[DEBUG] Supabase Storage upload failed:', uploadError);
      
      // Update status to failed
      await supabase
        .from('installer_downloads')
        .update({ status: 'failed' })
        .eq('id', downloadRecord.id);

      // Fallback: If file is small enough (< 4MB), send directly
      if (installerSize < 4 * 1024 * 1024) {
        console.log('[DEBUG] File is small enough, sending directly as fallback...');
        const installerBuffer = await fs.readFile(installerPath);
        
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="ABCDToolsSetup${path.extname(installerPath)}"`);
        res.setHeader('Content-Length', installerSize);
        res.setHeader('X-Download-Token', downloadToken);
        res.setHeader('X-Client-ID', clientId);
        
        return res.status(200).send(installerBuffer);
      } else {
        // File too large for direct download and upload failed
        throw new Error(`Installer upload failed: ${uploadError.message}`);
      }
    }

    // Update status to downloaded
    await supabase
      .from('installer_downloads')
      .update({
        status: 'downloaded',
        downloaded_at: new Date().toISOString(),
        metadata: {
          ...downloadRecord.metadata,
          downloadUrl,
          storagePath,
          fileSizeMB: sizeMB.toFixed(2),
        },
      })
      .eq('id', downloadRecord.id);

    // Clean up old installer files (older than 1 hour)
    try {
      const tempDir = path.dirname(installerPath);
      const files = await fs.readdir(tempDir);
      const now = Date.now();
      
      for (const file of files) {
        if (file.endsWith('.exe') || file.endsWith('.zip')) {
          const filePath = path.join(tempDir, file);
          const stats = await fs.stat(filePath);
          const age = now - stats.mtimeMs;
          
          if (age > 60 * 60 * 1000) { // 1 hour
            await fs.unlink(filePath);
            console.log('Cleaned up old installer:', filePath);
          }
        }
      }
    } catch (cleanupError) {
      console.warn('Failed to clean up old installers:', cleanupError);
      // Don't fail the request if cleanup fails
    }

    // Return download URL instead of file
    return res.status(200).json({
      success: true,
      downloadUrl,
      filename: `ABCDToolsSetup${path.extname(installerPath)}`,
      downloadToken,
      clientId,
      message: 'Installer ready for download',
    });

  } catch (err) {
    console.error('Installer download error:', err);

    if (err.message?.includes('authorization') || err.message?.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(500).json({
      error: err.message || 'Failed to generate installer',
    });
  }
}
