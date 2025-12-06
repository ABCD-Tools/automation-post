/**
 * Browser Detection API
 * Returns common browser paths for Windows
 * 
 * Note: True browser detection requires server-side access to the file system,
 * which is not possible from a web browser. This API returns common paths
 * that users can try.
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Common browser paths on Windows
  const commonPaths = {
    chrome: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      '%LOCALAPPDATA%\\Google\\Chrome\\Application\\chrome.exe',
    ],
    edge: [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ],
  };

  return res.status(200).json({
    success: true,
    browsers: {
      chrome: {
        name: 'Google Chrome',
        paths: commonPaths.chrome,
      },
      edge: {
        name: 'Microsoft Edge',
        paths: commonPaths.edge,
      },
    },
    message: 'These are common browser installation paths. Please verify the path exists on your system.',
  });
}

