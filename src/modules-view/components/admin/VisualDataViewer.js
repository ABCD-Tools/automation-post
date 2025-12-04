import { useState, useEffect } from 'react';

/**
 * VisualDataViewer - Component for viewing and testing visual data
 * Shows side-by-side comparison of recorded screenshot vs live preview
 */
export default function VisualDataViewer({ action, currentPageUrl }) {
  const [liveScreenshot, setLiveScreenshot] = useState(null);
  const [differenceHighlight, setDifferenceHighlight] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const visualData = action?.params?.visual || action?.visual || {};
  const hasRecordedScreenshot = !!visualData.screenshot;

  // Test match function - tries to find element on current page
  const handleTestMatch = async () => {
    setTesting(true);
    setMatchResult(null);

    try {
      // In a real implementation, this would:
      // 1. Send a request to the backend API
      // 2. Backend uses VisualActionExecutor to find the element
      // 3. Return match result with similarity score and position
      
      // Simulated API call
      const response = await fetch('/api/test-visual-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action,
          url: currentPageUrl || window.location.href,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setMatchResult(result);
      } else {
        setMatchResult({
          success: false,
          error: 'Failed to test match. Make sure you are on the correct page.',
        });
      }
    } catch (error) {
      setMatchResult({
        success: false,
        error: error.message || 'Error testing visual match',
      });
    } finally {
      setTesting(false);
    }
  };

  // Capture live screenshot (if on same page)
  const captureLiveScreenshot = async () => {
    try {
      // In a real implementation, this would use html2canvas or similar
      // to capture the current page state
      const response = await fetch('/api/capture-page-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: currentPageUrl || window.location.href,
          position: visualData.position,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLiveScreenshot(data.screenshot);
      }
    } catch (error) {
      console.error('Failed to capture live screenshot:', error);
    }
  };

  useEffect(() => {
    // Auto-capture live screenshot if on same page
    if (currentPageUrl && visualData.url === currentPageUrl) {
      captureLiveScreenshot();
    }
  }, [currentPageUrl, visualData.url]);

  if (!hasRecordedScreenshot) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <p className="text-yellow-800 text-sm">
          ⚠️ No visual data available for this action
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Visual Data Viewer</h3>
        <button
          onClick={handleTestMatch}
          disabled={testing}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {testing ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Testing...
            </>
          ) : (
            <>
              <span>🔍</span>
              <span>Test Match</span>
            </>
          )}
        </button>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left: Recorded Screenshot */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Recorded Screenshot</h4>
            {visualData.timestamp && (
              <span className="text-xs text-gray-500">
                {new Date(visualData.timestamp).toLocaleString()}
              </span>
            )}
          </div>
          <div className="relative border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
            <img
              src={visualData.screenshot}
              alt="Recorded screenshot"
              className="w-full h-auto"
            />
            {/* Position crosshair overlay */}
            {visualData.position && visualData.boundingBox && (
              <div
                className="absolute border-2 border-red-500 rounded"
                style={{
                  left: `${(visualData.boundingBox.x / (visualData.viewport?.width || 1280)) * 100}%`,
                  top: `${(visualData.boundingBox.y / (visualData.viewport?.height || 720)) * 100}%`,
                  width: `${(visualData.boundingBox.width / (visualData.viewport?.width || 1280)) * 100}%`,
                  height: `${(visualData.boundingBox.height / (visualData.viewport?.height || 720)) * 100}%`,
                }}
              >
                <div
                  className="absolute w-4 h-4 border-2 border-red-500 rounded-full -top-2 -left-2 bg-red-500"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                ></div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Live Preview</h4>
            <button
              onClick={captureLiveScreenshot}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              Refresh
            </button>
          </div>
          <div className="relative border border-gray-300 rounded-lg overflow-hidden bg-gray-50 min-h-[200px] flex items-center justify-center">
            {liveScreenshot ? (
              <img
                src={liveScreenshot}
                alt="Live screenshot"
                className="w-full h-auto"
              />
            ) : (
              <div className="text-center text-gray-400 py-8">
                <p className="text-sm">No live preview available</p>
                <p className="text-xs mt-1">Navigate to the page to see live preview</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Difference highlighting toggle */}
      {liveScreenshot && visualData.screenshot && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showDifferences"
            checked={differenceHighlight}
            onChange={(e) => setDifferenceHighlight(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="showDifferences" className="text-sm text-gray-700">
            Highlight differences (experimental)
          </label>
        </div>
      )}

      {/* Position coordinates */}
      {visualData.position && (
        <div className="bg-gray-50 p-4 rounded-md">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Position Coordinates</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600 font-medium">Absolute Position:</p>
              <p className="text-gray-800 font-mono">
                X: {visualData.position.absolute?.x || 'N/A'}px
                <br />
                Y: {visualData.position.absolute?.y || 'N/A'}px
              </p>
            </div>
            <div>
              <p className="text-gray-600 font-medium">Relative Position:</p>
              <p className="text-gray-800 font-mono">
                X: {visualData.position.relative?.x?.toFixed(2) || 'N/A'}%
                <br />
                Y: {visualData.position.relative?.y?.toFixed(2) || 'N/A'}%
              </p>
            </div>
          </div>
          {visualData.boundingBox && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-gray-600 font-medium text-sm">Bounding Box:</p>
              <p className="text-gray-800 font-mono text-sm">
                {visualData.boundingBox.width} × {visualData.boundingBox.height}px
                <br />
                at ({visualData.boundingBox.x}, {visualData.boundingBox.y})
              </p>
            </div>
          )}
        </div>
      )}

      {/* Surrounding text context */}
      {visualData.surroundingText && visualData.surroundingText.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-md">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Surrounding Text Context</h4>
          <div className="flex flex-wrap gap-2">
            {visualData.surroundingText.map((text, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-white rounded border border-gray-200 text-sm text-gray-700"
                title={text}
              >
                {text.length > 30 ? text.substring(0, 30) + '...' : text}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Match result */}
      {matchResult && (
        <div
          className={`p-4 rounded-md ${
            matchResult.success
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <h4 className="text-sm font-medium mb-2">
            {matchResult.success ? '✅ Match Found' : '❌ No Match'}
          </h4>
          {matchResult.success ? (
            <div className="text-sm space-y-1">
              <p>
                <span className="font-medium">Similarity:</span>{' '}
                {(matchResult.similarity * 100).toFixed(1)}%
              </p>
              <p>
                <span className="font-medium">Method:</span> {matchResult.method}
              </p>
              {matchResult.position && (
                <p>
                  <span className="font-medium">Found at:</span> ({matchResult.position.x},{' '}
                  {matchResult.position.y})
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-red-800">{matchResult.error}</p>
          )}
        </div>
      )}

      {/* Visual data summary */}
      <div className="bg-blue-50 p-4 rounded-md">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Visual Data Summary</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className={visualData.screenshot ? 'text-green-600' : 'text-red-600'}>
              {visualData.screenshot ? '✓' : '✗'}
            </span>
            <span>Screenshot</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={visualData.text ? 'text-green-600' : 'text-red-600'}>
              {visualData.text ? '✓' : '✗'}
            </span>
            <span>Text</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={visualData.position ? 'text-green-600' : 'text-red-600'}>
              {visualData.position ? '✓' : '✗'}
            </span>
            <span>Position</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={visualData.boundingBox ? 'text-green-600' : 'text-red-600'}>
              {visualData.boundingBox ? '✓' : '✗'}
            </span>
            <span>Bounding Box</span>
          </div>
        </div>
      </div>
    </div>
  );
}
