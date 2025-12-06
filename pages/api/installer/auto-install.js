/**
 * Generate Auto-Install Executable
 * 
 * Creates a Node.js-based installer executable that:
 * 1. Downloads the installer ZIP from Supabase
 * 2. Unzips it to the installation directory
 * 3. Sets up the agent
 * 
 * The installer is packaged as an .exe using pkg
 */

import { authenticateRequest } from '@modules-logic/middleware/auth';
import { createSupabaseServiceRoleClient } from '@modules-view/utils/supabase';
import { buildInstallerExecutable } from '@modules-installer/installer-builder.mjs';
import { uploadInstaller } from '@modules-logic/services/supabase-storage';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const user = await authenticateRequest(req);
    
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { downloadToken, installPath } = req.body;

    if (!downloadToken) {
      return res.status(400).json({ error: 'downloadToken is required' });
    }

    // Get download record to get the download URL
    const supabase = createSupabaseServiceRoleClient();
    const { data: downloadRecord, error: dbError } = await supabase
      .from('installer_downloads')
      .select('metadata, status')
      .eq('download_token', downloadToken)
      .eq('user_id', user.id)
      .single();

    if (dbError || !downloadRecord) {
      return res.status(404).json({ error: 'Download record not found' });
    }

    const downloadUrl = downloadRecord.metadata?.downloadUrl;
    if (!downloadUrl) {
      return res.status(400).json({ error: 'Download URL not found. Please generate installer first.' });
    }

    // Resolve install path
    let resolvedInstallPath = installPath || downloadRecord.metadata?.installPath || '%LOCALAPPDATA%\\ABCDTools';
    if (resolvedInstallPath.includes('{localappdata}')) {
      resolvedInstallPath = resolvedInstallPath.replace('{localappdata}', '%LOCALAPPDATA%');
    }

    // Build installer executable
    console.log('[DEBUG] Building installer executable...');
    const buildResult = await buildInstallerExecutable({
      downloadUrl,
      installPath: resolvedInstallPath,
    });

    if (!buildResult.success) {
      throw new Error(buildResult.message || 'Failed to build installer executable');
    }

    // Upload executable to Supabase Storage to avoid API size limit
    console.log('[DEBUG] Uploading executable to Supabase Storage...');
    let exeDownloadUrl;
    try {
      const uploadResult = await uploadInstaller(buildResult.installerPath, {
        userId: user.id,
        downloadToken: downloadToken,
      });
      
      exeDownloadUrl = uploadResult.publicUrl;
      console.log('[DEBUG] Executable uploaded successfully. URL:', exeDownloadUrl);
    } catch (uploadError) {
      console.error('[DEBUG] Supabase Storage upload failed:', uploadError);
      throw new Error(`Failed to upload installer executable: ${uploadError.message}`);
    }

    // Update download record metadata with executable URL
    await supabase
      .from('installer_downloads')
      .update({
        metadata: {
          ...downloadRecord.metadata,
          exeDownloadUrl,
          exeInstalledAt: new Date().toISOString(),
        },
      })
      .eq('download_token', downloadToken)
      .eq('user_id', user.id);

    // Return JSON response with download URL instead of file
    return res.status(200).json({
      success: true,
      downloadUrl: exeDownloadUrl,
      filename: 'ABCDToolsInstaller.exe',
      downloadToken,
      message: 'Installer executable ready for download',
    });

  } catch (err) {
    console.error('Auto-install executable generation error:', err);

    if (err.message?.includes('authorization') || err.message?.includes('token')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(500).json({
      error: err.message || 'Failed to generate installer executable',
    });
  }
}
