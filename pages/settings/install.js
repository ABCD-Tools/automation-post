import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { generateRSAKey, validateKeys } from '@modules-view/utils/key-generator';
import { detectBrowser, validateBrowserPath } from '@modules-view/utils/browser-detector';

export default function Install() {
  const router = useRouter();
  const [browserPath, setBrowserPath] = useState('');
  const [keyMode, setKeyMode] = useState('auto'); // 'auto' or 'manual'
  const [encryptionKey, setEncryptionKey] = useState('');
  const [decryptionKey, setDecryptionKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCommonPaths, setShowCommonPaths] = useState(false);
  
  // Common browser paths (no API call needed)
  const commonBrowserPaths = {
    chrome: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Users\\%USERNAME%\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
    ],
    edge: [
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Users\\%USERNAME%\\AppData\\Local\\Microsoft\\Edge\\Application\\msedge.exe',
    ],
  };

  // Auto-generate keys when mode is 'auto'
  useEffect(() => {
    if (keyMode === 'auto') {
      generateRSAKey()
        .then(keys => {
          // Validate generated keys before setting
          console.log('[KEY GENERATION] Validating generated keys...');
          console.log('[KEY GENERATION] Public key length:', keys.encryptionKey.length);
          console.log('[KEY GENERATION] Public key has newlines:', keys.encryptionKey.includes('\n'));
          console.log('[KEY GENERATION] Public key lines:', keys.encryptionKey.split('\n').length);
          console.log('[KEY GENERATION] Private key length:', keys.decryptionKey.length);
          console.log('[KEY GENERATION] Private key has newlines:', keys.decryptionKey.includes('\n'));
          console.log('[KEY GENERATION] Private key lines:', keys.decryptionKey.split('\n').length);
          
          const validation = validateKeys(keys.encryptionKey, keys.decryptionKey);
          if (!validation.valid) {
            console.error('[KEY GENERATION] Validation failed:', validation.errors);
            setError('Generated keys are invalid: ' + validation.errors.join(', '));
            return;
          }
          
          console.log('[KEY GENERATION] ✓ Keys validated successfully');
          setEncryptionKey(keys.encryptionKey);
          setDecryptionKey(keys.decryptionKey);
        })
        .catch(err => {
          console.error('[KEY GENERATION] Error:', err);
          setError('Failed to generate encryption keys: ' + err.message);
        });
    }
  }, [keyMode]);

  const handleBrowseBrowser = () => {
    // Create file input for .exe selection
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.exe';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        // Get full path (this may not work in all browsers due to security)
        // For MVP, user will need to paste the path manually
        setBrowserPath(file.name);
        alert('Please paste the full path to the browser executable (e.g., C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe)');
      }
    };
    input.click();
  };

  const handleShowCommonPaths = () => {
    setShowCommonPaths(!showCommonPaths);
    if (!showCommonPaths) {
      // Set first Chrome path as default when showing common paths
      if (commonBrowserPaths.chrome.length > 0 && !browserPath) {
        setBrowserPath(commonBrowserPaths.chrome[0]);
      }
    }
  };

  const handleSelectCommonPath = (path) => {
    setBrowserPath(path);
    setShowCommonPaths(false);
    setSuccess(`Browser path set to: ${path}`);
  };

  const handleDownload = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    // For developer ZIP, we don't need installPath upfront
    // The agent will send its actual installPath (process.cwd()) when it registers
    // Use a placeholder - it won't be used anyway since agent sends actual path
    const placeholderInstallPath = '{extract_location}';

    if (!browserPath) {
      setError('Browser path is required');
      setLoading(false);
      return;
    }

    // Validate browser path format
    const browserValidation = validateBrowserPath(browserPath);
    if (!browserValidation.valid) {
      setError(browserValidation.error);
      setLoading(false);
      return;
    }

    // Validate keys with detailed checks
    console.log('[DOWNLOAD] Validating keys before download...');
    console.log('[DOWNLOAD] Encryption key length:', encryptionKey.length);
    console.log('[DOWNLOAD] Encryption key has newlines:', encryptionKey.includes('\n'));
    console.log('[DOWNLOAD] Encryption key lines:', encryptionKey.split('\n').length);
    console.log('[DOWNLOAD] Decryption key length:', decryptionKey.length);
    console.log('[DOWNLOAD] Decryption key has newlines:', decryptionKey.includes('\n'));
    console.log('[DOWNLOAD] Decryption key lines:', decryptionKey.split('\n').length);
    
    const keyValidation = validateKeys(encryptionKey, decryptionKey);
    if (!keyValidation.valid) {
      console.error('[DOWNLOAD] Key validation failed:', keyValidation.errors);
      setError(keyValidation.errors.join(', '));
      setLoading(false);
      return;
    }
    
    // Additional validation: Check that keys have proper PEM structure
    if (!encryptionKey.includes('\n') || !decryptionKey.includes('\n')) {
      console.error('[DOWNLOAD] Keys are missing newlines - this will cause issues in .env file');
      setError('Keys must have proper newlines. Please regenerate keys.');
      setLoading(false);
      return;
    }
    
    console.log('[DOWNLOAD] ✓ Keys validated successfully');

    try {
      // Get auth token from storage
      const getAuthToken = () => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      };

      const token = getAuthToken();
      console.log('[DEBUG] Frontend - Token found:', token ? 'Yes (length: ' + token.length + ')' : 'No');

      if (!token) {
        setError('You must be logged in to download the installer. Please log in and try again.');
        setLoading(false);
        return;
      }

      // Call download API with Authorization header
      const response = await fetch('/api/installer/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          installPath: placeholderInstallPath, // Placeholder - agent will send actual path
          browserPath,
          encryptionKey,
          decryptionKey,
          debugMode: true, // Always true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate installer' }));
        throw new Error(errorData.error || 'Failed to generate installer');
      }

      // Response should be JSON with downloadUrl
      const data = await response.json();
      
      if (data.downloadUrl) {
        // Store download state before redirecting
        if (typeof window !== 'undefined') {
          localStorage.setItem('isDownloaded', 'true');
        }
        
        // Create a temporary link to trigger download without navigating away
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = ''; // This tells the browser to download instead of navigate
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Redirect to clients page after a short delay
        setTimeout(() => {
          router.push('/clients');
        }, 500);
        
        // Note: Success message will be shown on clients page
        setLoading(false);
        return;
      } else {
        throw new Error('No download URL received');
      }
      
    } catch (err) {
      setError(err.message || 'Failed to download installer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Install ABCD Tools Client</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <span className="text-2xl mr-3">ℹ️</span>
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Automatic Installation Detection</h3>
                <p className="text-sm text-blue-800">
                  You don't need to specify an installation directory. The agent will automatically detect 
                  where it's running from and register that location with the server when it starts.
                </p>
              </div>
            </div>
          </div>

          {/* Browser Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Browser Executable
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={browserPath}
                onChange={(e) => setBrowserPath(e.target.value)}
                placeholder="C:\Program Files\Google\Chrome\Application\chrome.exe"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleShowCommonPaths}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
              >
                {showCommonPaths ? 'Hide Paths' : 'Common Paths'}
              </button>
              <button
                onClick={handleBrowseBrowser}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Browse...
              </button>
            </div>
            {showCommonPaths && (
              <div className="mt-2 p-4 border border-blue-200 rounded-md bg-blue-50">
                <p className="text-sm font-semibold text-blue-900 mb-3">Common Browser Paths:</p>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-blue-800 mb-2">Chrome:</p>
                    <div className="space-y-1">
                      {commonBrowserPaths.chrome.map((path, i) => (
                        <button
                          key={i}
                          onClick={() => handleSelectCommonPath(path)}
                          className="w-full text-left px-3 py-2 bg-white border border-blue-200 rounded hover:bg-blue-100 hover:border-blue-300 transition-colors"
                        >
                          <p className="text-xs font-mono text-gray-800">{path}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-blue-800 mb-2">Edge:</p>
                    <div className="space-y-1">
                      {commonBrowserPaths.edge.map((path, i) => (
                        <button
                          key={i}
                          onClick={() => handleSelectCommonPath(path)}
                          className="w-full text-left px-3 py-2 bg-white border border-blue-200 rounded hover:bg-blue-100 hover:border-blue-300 transition-colors"
                        >
                          <p className="text-xs font-mono text-gray-800">{path}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-xs text-blue-700">
                  Click on a path above to select it, or manually enter your browser path.
                </p>
              </div>
            )}
            {browserPath && !validateBrowserPath(browserPath).valid && (
              <p className="mt-1 text-sm text-red-600">
                {validateBrowserPath(browserPath).error}
              </p>
            )}
          </div>

          {/* Encryption Key Generation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Encryption Keys
            </label>
            <div className="flex gap-4 mb-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="auto"
                  checked={keyMode === 'auto'}
                  onChange={(e) => setKeyMode(e.target.value)}
                  className="mr-2"
                />
                <span>Auto (Recommended)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="manual"
                  checked={keyMode === 'manual'}
                  onChange={(e) => setKeyMode(e.target.value)}
                  className="mr-2"
                />
                <span>Manual</span>
              </label>
            </div>

            {keyMode === 'manual' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Encryption Key (32-byte hex)
                  </label>
                  <input
                    type="text"
                    value={encryptionKey}
                    onChange={(e) => setEncryptionKey(e.target.value)}
                    placeholder="64-character hex string"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Decryption Key (32-byte hex)
                  </label>
                  <input
                    type="text"
                    value={decryptionKey}
                    onChange={(e) => setDecryptionKey(e.target.value)}
                    placeholder="64-character hex string"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>
              </div>
            )}

            {keyMode === 'auto' && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  ✓ Keys generated automatically. They will be embedded in the installer.
                </p>
              </div>
            )}
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          {/* Developer Mode Info - Always enabled */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <span className="text-2xl mr-3">💻</span>
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Developer Mode</h3>
                <p className="text-sm text-blue-800">
                  Download a ZIP file with source code, Node.js binary, dependencies, and start_agent.bat.
                  Extract and run <code className="bg-blue-100 px-1 rounded">start_agent.bat</code> to start the agent.
                </p>
                <p className="text-xs text-blue-700 mt-2">
                  <strong>Note:</strong> The agent will automatically register itself with the server when it starts,
                  sending its installation directory. No need to specify it here.
                </p>
              </div>
            </div>
          </div>
          
          {/* Hidden debug mode toggle - always true */}
          <input type="hidden" value="true" />

          {/* Download Button */}
          <div>
            <button
              onClick={handleDownload}
              disabled={loading || !browserPath || !encryptionKey || !decryptionKey}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Generating Developer ZIP...' : 'Download Developer ZIP'}
            </button>
            <p className="mt-2 text-xs text-gray-500 text-center">
              Extract the ZIP and run <code className="bg-gray-100 px-1 rounded">start_agent.bat</code>. 
              The agent will automatically register with the server.
            </p>
          </div>
        </div>

        {/* Installation Instructions */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Installation Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Click "Download Developer ZIP" to download the agent package</li>
            <li>Extract the ZIP file to any location on your computer</li>
            <li>Open the extracted folder and run <code className="bg-gray-200 px-1 rounded">start_agent.bat</code></li>
            <li>The agent will start and automatically register itself with the server</li>
            <li>Check the <a href="/clients" className="text-blue-600 hover:underline">Clients page</a> to see your agent status</li>
            <li>You can now add accounts and create posts!</li>
          </ol>

          <h3 className="text-lg font-semibold mt-6 mb-2">How It Works</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>The agent automatically detects its installation directory (where you extracted the ZIP)</li>
            <li>When the agent starts, it registers itself with the server and sends its installation path</li>
            <li>The server stores this information and displays it on the Clients page</li>
            <li>No manual configuration needed - everything is automatic!</li>
          </ul>

          <h3 className="text-lg font-semibold mt-6 mb-2">Troubleshooting</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>Make sure Chrome or Edge is installed</li>
            <li>Check the logs folder for error messages</li>
            <li>Verify the API endpoint is accessible from your network</li>
            <li>If the agent doesn't appear on the Clients page, check that it's running and connected</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
