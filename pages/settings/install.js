import { useState, useEffect } from 'react';
import { generateAESKey, validateKeys } from '@modules-view/utils/key-generator';
import { detectBrowser, validateBrowserPath } from '@modules-view/utils/browser-detector';

export default function Install() {
  const [installPath, setInstallPath] = useState('');
  const [browserPath, setBrowserPath] = useState('');
  const [keyMode, setKeyMode] = useState('auto'); // 'auto' or 'manual'
  const [encryptionKey, setEncryptionKey] = useState('');
  const [decryptionKey, setDecryptionKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [browserDetected, setBrowserDetected] = useState(null);
  const [debugMode, setDebugMode] = useState(false);

  // Set default install path
  useEffect(() => {
    if (!installPath) {
      // Default to AppData\Local\ABCDTools
      // Use {localappdata} which Inno Setup will resolve to %LOCALAPPDATA%
      // For display purposes, show a typical path
      const defaultPath = '{localappdata}\\ABCDTools';
      setInstallPath(defaultPath);
    }
  }, []);

  // Auto-generate keys when mode is 'auto'
  useEffect(() => {
    if (keyMode === 'auto') {
      generateAESKey()
        .then(keys => {
          setEncryptionKey(keys.encryptionKey);
          setDecryptionKey(keys.decryptionKey);
        })
        .catch(err => {
          setError('Failed to generate encryption keys: ' + err.message);
        });
    }
  }, [keyMode]);

  const handleBrowseInstallPath = () => {
    // Note: HTML5 file picker doesn't support directory selection directly
    // For MVP, use text input with manual path entry
    // In production, consider using a native file dialog via Electron or similar
    const path = prompt('Enter installation path:', installPath);
    if (path) {
      setInstallPath(path);
    }
  };

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

  const handleAutoDetectBrowser = async () => {
    setLoading(true);
    setError('');
    setBrowserDetected(null);
    
    try {
      // Call server API to get common browser paths
      const response = await fetch('/api/browser/detect');
      const data = await response.json();
      
      if (data.success && data.browsers) {
        // Try Chrome first, then Edge
        const chromePaths = data.browsers.chrome.paths;
        const edgePaths = data.browsers.edge.paths;
        
        // For now, set the first Chrome path as default (user can change it)
        // In a real implementation, we'd need to check if the file exists
        // which requires a browser extension or desktop app
        if (chromePaths && chromePaths.length > 0) {
          setBrowserPath(chromePaths[0]);
          setBrowserDetected({
            found: true,
            browser: 'chrome',
            path: chromePaths[0],
            message: `Auto-detected Chrome at: ${chromePaths[0]}. Please verify this path is correct.`,
            allPaths: {
              chrome: chromePaths,
              edge: edgePaths,
            },
          });
          setSuccess(`Auto-detected Chrome. Path set to: ${chromePaths[0]}`);
        } else if (edgePaths && edgePaths.length > 0) {
          setBrowserPath(edgePaths[0]);
          setBrowserDetected({
            found: true,
            browser: 'edge',
            path: edgePaths[0],
            message: `Auto-detected Edge at: ${edgePaths[0]}. Please verify this path is correct.`,
            allPaths: {
              chrome: chromePaths,
              edge: edgePaths,
            },
          });
          setSuccess(`Auto-detected Edge. Path set to: ${edgePaths[0]}`);
        } else {
          setBrowserDetected({
            found: false,
            message: 'Could not auto-detect browser. Please use the Browse button to select your browser executable.',
            allPaths: {
              chrome: chromePaths,
              edge: edgePaths,
            },
          });
        }
      } else {
        throw new Error('Failed to get browser paths from server');
      }
    } catch (err) {
      setError('Failed to detect browser: ' + err.message);
      setBrowserDetected({
        found: false,
        message: 'Auto-detection failed. Please use the Browse button to select your browser executable.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    // Validate inputs
    if (!installPath) {
      setError('Installation path is required');
      setLoading(false);
      return;
    }

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

    // Validate keys
    const keyValidation = validateKeys(encryptionKey, decryptionKey);
    if (!keyValidation.valid) {
      setError(keyValidation.errors.join(', '));
      setLoading(false);
      return;
    }

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
          installPath,
          browserPath,
          encryptionKey,
          decryptionKey,
          debugMode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate installer' }));
        throw new Error(errorData.error || 'Failed to generate installer');
      }

      // Response should be JSON with downloadUrl
      const data = await response.json();
      
      if (data.downloadUrl) {
        // In debug mode, skip auto-install and go straight to ZIP download
        if (debugMode) {
          // Developer ZIP - redirect directly
          window.location.href = data.downloadUrl;
          setSuccess('Developer ZIP downloaded. Extract and run start_agent.bat to start the agent.');
          setLoading(false);
          return;
        }

        // Ask user if they want auto-install executable or manual ZIP download
        const useAutoInstall = confirm(
          'Choose installation method:\n\n' +
          'OK = Auto-Install (Downloads .exe installer that installs automatically)\n' +
          'Cancel = Manual Download (Downloads ZIP file to install manually)\n\n' +
          'Auto-Install is recommended - just double-click the .exe file!'
        );

        if (useAutoInstall) {
          // Generate and download auto-install executable
          try {
            setLoading(true);
            const exeResponse = await fetch('/api/installer/auto-install', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                downloadToken: data.downloadToken,
                installPath: installPath,
              }),
            });

            if (!exeResponse.ok) {
              const errorData = await exeResponse.json().catch(() => ({ error: 'Failed to generate installer' }));
              throw new Error(errorData.error || 'Failed to generate installer executable');
            }

            // Response is JSON with downloadUrl (executable is in Supabase Storage)
            const exeData = await exeResponse.json();
            
            if (exeData.downloadUrl) {
              // Redirect to Supabase Storage URL for download
              window.location.href = exeData.downloadUrl;
            } else {
              throw new Error('No download URL received from server');
            }

            setSuccess(
              'Installer downloaded! Double-click ABCDToolsInstaller.exe to install automatically. ' +
              'The installer will download and set up ABCD Tools for you.'
            );
          } catch (exeError) {
            console.error('Auto-install executable error:', exeError);
            setError('Failed to generate installer executable: ' + exeError.message + '. Trying manual download...');
            // Fallback to manual download
            setTimeout(() => {
              window.location.href = data.downloadUrl;
              setSuccess('Installer ZIP downloaded. Extract and run agent.exe to install.');
            }, 2000);
          } finally {
            setLoading(false);
          }
        } else {
          // Manual download - redirect to ZIP URL
          window.location.href = data.downloadUrl;
          setSuccess('Installer ZIP downloaded. Extract the ZIP file and run agent.exe to install.');
        }
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
          {/* Installation Directory */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Installation Directory
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={installPath}
                onChange={(e) => setInstallPath(e.target.value)}
                placeholder="C:\Users\YourName\AppData\Local\ABCDTools"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleBrowseInstallPath}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Browse...
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Default: %APPDATA%\Local\ABCDTools
            </p>
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
                onClick={handleAutoDetectBrowser}
                disabled={loading}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50"
              >
                Auto-detect
              </button>
              <button
                onClick={handleBrowseBrowser}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Browse...
              </button>
            </div>
            {browserDetected && (
              <div className={`mt-2 p-3 border rounded-md ${
                browserDetected.found 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <p className={`text-sm ${
                  browserDetected.found ? 'text-green-800' : 'text-yellow-800'
                }`}>
                  {browserDetected.message}
                </p>
                {browserDetected.allPaths && (
                  <div className="mt-2 text-xs">
                    <p className="font-semibold mb-1">Common paths:</p>
                    <div className="space-y-1">
                      <div>
                        <span className="font-medium">Chrome:</span>
                        <ul className="list-disc list-inside ml-2">
                          {browserDetected.allPaths.chrome?.slice(0, 2).map((path, i) => (
                            <li key={i} className="font-mono text-xs">{path}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="font-medium">Edge:</span>
                        <ul className="list-disc list-inside ml-2">
                          {browserDetected.allPaths.edge?.slice(0, 2).map((path, i) => (
                            <li key={i} className="font-mono text-xs">{path}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
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

          {/* Debug Mode Toggle */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={debugMode}
                onChange={(e) => setDebugMode(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">
                Developer Mode (Download ZIP with Node.js, node_modules, and .bat script)
              </span>
            </label>
            {debugMode && (
              <p className="mt-1 text-xs text-gray-500">
                For developers: Downloads a ZIP file with source code, Node.js binary, dependencies, and start_agent.bat
              </p>
            )}
          </div>

          {/* Download Button */}
          <div>
            <button
              onClick={handleDownload}
              disabled={loading || !installPath || !browserPath || !encryptionKey || !decryptionKey}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? (debugMode ? 'Generating Developer ZIP...' : 'Generating Installer...') : (debugMode ? 'Download Developer ZIP' : 'Download Installer')}
            </button>
          </div>
        </div>

        {/* Installation Instructions */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Installation Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Click "Download Installer" to download ABCDToolsSetup.exe</li>
            <li>Run the installer (you may need administrator privileges)</li>
            <li>Follow the installation wizard</li>
            <li>The agent will start automatically after installation</li>
            <li>You can now use abcdtools:// deep links to trigger the agent</li>
          </ol>

          <h3 className="text-lg font-semibold mt-6 mb-2">Troubleshooting</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>If installation fails, ensure you have administrator privileges</li>
            <li>Make sure Chrome or Edge is installed</li>
            <li>Check the logs folder for error messages</li>
            <li>Verify the API endpoint is accessible from your network</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
