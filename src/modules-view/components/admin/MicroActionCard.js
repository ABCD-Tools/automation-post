import { useState } from 'react';

const typeColors = {
  click: 'bg-blue-100 text-blue-800',
  type: 'bg-green-100 text-green-800',
  wait: 'bg-yellow-100 text-yellow-800',
  navigate: 'bg-purple-100 text-purple-800',
  upload: 'bg-pink-100 text-pink-800',
  extract: 'bg-orange-100 text-orange-800',
  scroll: 'bg-gray-100 text-gray-800',
  screenshot: 'bg-indigo-100 text-indigo-800',
};

const executionMethodColors = {
  visual_first: 'bg-purple-100 text-purple-800',
  selector_first: 'bg-blue-100 text-blue-800',
  visual_only: 'bg-green-100 text-green-800',
};

export default function MicroActionCard({ action, onEdit, onDelete }) {
  const [showParams, setShowParams] = useState(false);
  const [showFullScreenshot, setShowFullScreenshot] = useState(false);

  // Extract visual data
  const hasVisualData = action.params?.visual !== undefined;
  const hasScreenshot = action.params?.visual?.screenshot !== undefined;
  const hasBackupSelector = action.params?.backup_selector !== undefined;
  const executionMethod = action.params?.execution_method || 'selector_first';
  const visualData = action.params?.visual || {};

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg transition-shadow">
      {/* Header with Screenshot Thumbnail */}
      <div className="flex items-start justify-between mb-3 gap-3">
        {/* Screenshot Thumbnail - 50x50px */}
        {hasScreenshot && (
          <div className="relative group flex-shrink-0">
            <img
              src={visualData.screenshot}
              alt="Action screenshot"
              className="w-[50px] h-[50px] rounded border border-gray-300 object-cover cursor-pointer hover:ring-2 hover:ring-blue-500"
              onClick={() => setShowFullScreenshot(true)}
              title="Click to view full screenshot"
            />
            <div className="absolute bottom-0 right-0 bg-green-500 w-3 h-3 rounded-full border-2 border-white" 
                 title="Has visual data"></div>
            {/* Tooltip on hover showing full screenshot */}
            <div className="absolute left-full ml-2 top-0 hidden group-hover:block z-50 bg-white rounded-lg shadow-xl border border-gray-300 p-2">
              <img
                src={visualData.screenshot}
                alt="Screenshot preview"
                className="w-64 h-64 object-contain rounded"
              />
              <p className="text-xs text-gray-600 mt-1 text-center">{action.name}</p>
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
            {action.name}
          </h3>
          {action.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {action.description}
            </p>
          )}
          
          {/* Visual Data Info */}
          {hasVisualData && visualData.text && (
            <p className="text-xs text-gray-500 mt-1 truncate" title={visualData.text}>
              📝 "{visualData.text}"
            </p>
          )}
          {hasVisualData && visualData.position && (
            <p className="text-xs text-gray-400 mt-0.5">
              📍 Position: ({visualData.position.relative?.x?.toFixed(1)}%, {visualData.position.relative?.y?.toFixed(1)}%)
            </p>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[action.type] || 'bg-gray-100 text-gray-800'}`}
        >
          {action.type}
        </span>
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {action.platform}
        </span>
        
        {/* Visual Data Badge */}
        {hasVisualData && (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1"
                title="Has visual data (screenshot, position, text)">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/>
            </svg>
            Visual
          </span>
        )}
        
        {/* Selector Badge */}
        {hasBackupSelector && (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex items-center gap-1"
                title={`Backup selector: ${action.params.backup_selector}`}>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
            Selector
          </span>
        )}
        
        {/* Execution Method Badge */}
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${executionMethodColors[executionMethod] || 'bg-gray-100 text-gray-800'}`}
              title="Execution strategy">
          {executionMethod === 'visual_first' && '🔍 Visual First'}
          {executionMethod === 'selector_first' && '⚡ Selector First'}
          {executionMethod === 'visual_only' && '👁️ Visual Only'}
        </span>
        
        {!action.is_active && (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Inactive
          </span>
        )}
      </div>
      
      {/* Surrounding Text Context */}
      {hasVisualData && visualData.surroundingText && visualData.surroundingText.length > 0 && (
        <div className="mb-3 p-2 bg-gray-50 rounded text-xs">
          <p className="text-gray-600 font-medium mb-1">Context:</p>
          <div className="flex flex-wrap gap-1">
            {visualData.surroundingText.slice(0, 3).map((text, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-white rounded border border-gray-200 text-gray-700"
                    title={text}>
                {text.length > 20 ? text.substring(0, 20) + '...' : text}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Params (collapsible) */}
      <div className="mb-3">
        <button
          onClick={() => setShowParams(!showParams)}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showParams ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          {showParams ? 'Hide' : 'Show'} Params
        </button>
        {showParams && (
          <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
            {JSON.stringify(action.params, null, 2)}
          </pre>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-200">
        <button
          onClick={() => onEdit(action)}
          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(action)}
          className="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
        >
          Delete
        </button>
      </div>
      
      {/* Full Screenshot Modal */}
      {showFullScreenshot && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
             onClick={() => setShowFullScreenshot(false)}>
          <div className="bg-white rounded-lg p-4 max-w-4xl max-h-[90vh] overflow-auto"
               onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{action.name}</h3>
                <p className="text-sm text-gray-600">Recorded Screenshot</p>
              </div>
              <button
                onClick={() => setShowFullScreenshot(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            <img
              src={visualData.screenshot}
              alt="Full screenshot"
              className="w-full rounded border border-gray-300"
            />
            
            {/* Visual Data Details */}
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              {visualData.text && (
                <div>
                  <p className="font-medium text-gray-700">Visible Text:</p>
                  <p className="text-gray-600">"{visualData.text}"</p>
                </div>
              )}
              {visualData.position && (
                <div>
                  <p className="font-medium text-gray-700">Position:</p>
                  <p className="text-gray-600">
                    Absolute: ({visualData.position.absolute?.x}px, {visualData.position.absolute?.y}px)<br/>
                    Relative: ({visualData.position.relative?.x?.toFixed(2)}%, {visualData.position.relative?.y?.toFixed(2)}%)
                  </p>
                </div>
              )}
              {visualData.boundingBox && (
                <div>
                  <p className="font-medium text-gray-700">Bounds:</p>
                  <p className="text-gray-600">
                    {visualData.boundingBox.width}x{visualData.boundingBox.height} at ({visualData.boundingBox.x}, {visualData.boundingBox.y})
                  </p>
                </div>
              )}
              {hasBackupSelector && (
                <div>
                  <p className="font-medium text-gray-700">Backup Selector:</p>
                  <p className="text-gray-600 font-mono text-xs">{action.params.backup_selector}</p>
                </div>
              )}
            </div>
            
            {visualData.surroundingText && visualData.surroundingText.length > 0 && (
              <div className="mt-4">
                <p className="font-medium text-gray-700 mb-2">Surrounding Context:</p>
                <div className="flex flex-wrap gap-2">
                  {visualData.surroundingText.map((text, idx) => (
                    <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
                      {text}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

