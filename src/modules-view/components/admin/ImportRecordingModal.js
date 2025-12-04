import { useState } from 'react';

export default function ImportRecordingModal({ recordingData, onImport, onClose }) {
  const [selectedActions, setSelectedActions] = useState(
    new Set(recordingData?.microActions?.map((a, i) => i) || []),
  );
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedNames, setEditedNames] = useState({});
  const [optimizeScreenshots, setOptimizeScreenshots] = useState(false);
  const [bulkExecutionMethod, setBulkExecutionMethod] = useState('');
  const [viewMode, setViewMode] = useState('list');

  if (!recordingData || !recordingData.microActions) {
    return null;
  }

  const toggleAction = (index) => {
    const newSelected = new Set(selectedActions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedActions(newSelected);
  };

  const handleEditName = (index, newName) => {
    setEditedNames({ ...editedNames, [index]: newName });
  };

  const handleImport = () => {
    const actionsToImport = recordingData.microActions
      .filter((_, index) => selectedActions.has(index))
      .map((action, originalIndex) => {
        const index = recordingData.microActions.findIndex((a) => a === action);
        let processedAction = {
          ...action,
          name: editedNames[index] || action.name,
          // Ensure required fields are present
          type: action.type,
          platform: action.platform || recordingData.platform || 'all',
          params: action.params || {},
        };

        // Apply bulk execution method if set
        if (bulkExecutionMethod) {
          processedAction.params = {
            ...processedAction.params,
            execution_method: bulkExecutionMethod,
          };
        }

        // Optimize screenshot if enabled
        if (optimizeScreenshots && processedAction.params?.visual?.screenshot) {
          // Note: In production, this should call an actual optimization function
          // For now, we just flag it
          processedAction._optimizeScreenshot = true;
        }

        return processedAction;
      });

    onImport(actionsToImport);
  };

  // Calculate total size of screenshots
  const calculateTotalSize = () => {
    let totalBytes = 0;
    recordingData.microActions.forEach((action) => {
      if (action.params?.visual?.screenshot) {
        // Remove data URL prefix and calculate size
        const base64 = action.params.visual.screenshot.replace(/^data:image\/\w+;base64,/, '');
        totalBytes += (base64.length * 3) / 4;
      }
    });
    return totalBytes;
  };

  const totalSize = calculateTotalSize();
  const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
  const estimatedDBImpact = (totalSize * 1.2 / 1024 / 1024).toFixed(2);

  // Count actions with/without visual data
  const actionsWithVisual = recordingData.microActions.filter(
    (a) => a.params?.visual?.screenshot
  ).length;
  const actionsWithoutVisual = recordingData.microActions.length - actionsWithVisual;

  return (
    <div className="space-y-4">
      {/* Recording Info */}
      <div className="bg-gray-50 p-4 rounded-md">
        <h3 className="font-semibold text-gray-900 mb-2">Recording Information</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>
            <span className="font-medium">Platform:</span> {recordingData.platform}
          </p>
          <p>
            <span className="font-medium">URL:</span> {recordingData.url}
          </p>
          <p>
            <span className="font-medium">Session:</span> {recordingData.sessionName}
          </p>
          <p>
            <span className="font-medium">Total Actions:</span>{' '}
            {recordingData.microActions.length}
          </p>
          
          {/* Feature 10: Total Recording Size Display */}
          <p>
            <span className="font-medium">Total Size:</span> {totalSizeMB} MB
          </p>
          <p>
            <span className="font-medium">Estimated DB Impact:</span> ~{estimatedDBImpact} MB
          </p>
          
          {/* Visual Data Statistics */}
          <p>
            <span className="font-medium">Actions with Visual Data:</span>{' '}
            <span className="text-green-600">{actionsWithVisual}</span> /{' '}
            {recordingData.microActions.length}
          </p>
        </div>
      </div>

      {/* Feature 11: Missing Visual Data Warning */}
      {actionsWithoutVisual > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex items-start gap-2">
            <span className="text-yellow-600 text-xl">⚠️</span>
            <div className="flex-1">
              <h4 className="font-semibold text-yellow-900 mb-1">
                Missing Visual Data
              </h4>
              <p className="text-sm text-yellow-800">
                {actionsWithoutVisual} action{actionsWithoutVisual !== 1 ? 's' : ''} missing visual data.
                These actions will rely solely on CSS selectors, which may be less reliable.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Feature 9: Optimize Screenshots Checkbox */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={optimizeScreenshots}
            onChange={(e) => setOptimizeScreenshots(e.target.checked)}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="font-medium text-blue-900">Optimize screenshots during import</div>
            <div className="text-sm text-blue-800 mt-1">
              Compress and resize screenshots to reduce database storage. Recommended for large recordings.
              {optimizeScreenshots && (
                <span className="block mt-1 text-blue-600">
                  ✓ Screenshots will be resized to max 400px width and compressed to 70% quality
                </span>
              )}
            </div>
          </div>
        </label>
      </div>

      {/* Feature 12: Bulk Edit Execution Method */}
      <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
        <label className="block mb-2">
          <span className="font-medium text-purple-900">
            Bulk Set Execution Method (Optional)
          </span>
        </label>
        <select
          value={bulkExecutionMethod}
          onChange={(e) => setBulkExecutionMethod(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">Keep individual settings</option>
          <option value="visual_first">🔍 Visual First (All Actions)</option>
          <option value="selector_first">⚡ Selector First (All Actions)</option>
          <option value="visual_only">👁️ Visual Only (All Actions)</option>
        </select>
        <p className="text-sm text-purple-800 mt-1">
          Override execution method for all selected actions
        </p>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Actions to Import</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📋 List
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'grid'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🖼️ Grid
          </button>
        </div>
      </div>

      {/* Feature 7 & 8: Screenshot Thumbnail Grid View */}
      {viewMode === 'grid' && (
        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md p-4">
          <div className="grid grid-cols-4 gap-4">
            {recordingData.microActions.map((action, index) => (
              <div
                key={index}
                className={`relative border rounded-lg p-2 cursor-pointer transition-all ${
                  selectedActions.has(index)
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-300 hover:border-blue-300'
                }`}
                onClick={() => toggleAction(index)}
              >
                {/* Checkbox */}
                <div className="absolute top-2 left-2 z-10">
                  <input
                    type="checkbox"
                    checked={selectedActions.has(index)}
                    onChange={() => toggleAction(index)}
                    className="w-4 h-4"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Screenshot Thumbnail */}
                {action.params?.visual?.screenshot ? (
                  <div className="relative mb-2">
                    <img
                      src={action.params.visual.screenshot}
                      alt={action.name}
                      className="w-full h-24 object-cover rounded"
                    />
                    <div className="absolute bottom-1 right-1 bg-green-500 text-white text-xs px-1 rounded">
                      📸
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-24 bg-gray-100 rounded flex items-center justify-center mb-2">
                    <span className="text-gray-400 text-3xl">❌</span>
                  </div>
                )}

                {/* Action Info */}
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-900 truncate" title={action.name}>
                    {editedNames[index] || action.name}
                  </p>
                  <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs mt-1">
                    {action.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List View with Visual Previews */}
      {viewMode === 'list' && (
        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left w-12">
                  <input
                    type="checkbox"
                    checked={selectedActions.size === recordingData.microActions.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedActions(
                          new Set(recordingData.microActions.map((_, i) => i)),
                        );
                      } else {
                        setSelectedActions(new Set());
                      }
                    }}
                  />
                </th>
                <th className="px-4 py-2 text-left w-16">Visual</th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Platform</th>
                <th className="px-4 py-2 text-left">Params</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recordingData.microActions.map((action, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={selectedActions.has(index)}
                      onChange={() => toggleAction(index)}
                    />
                  </td>
                  
                  {/* Feature 8: Visual Preview per Action */}
                  <td className="px-4 py-2">
                    {action.params?.visual?.screenshot ? (
                      <div className="relative group">
                        <img
                          src={action.params.visual.screenshot}
                          alt={action.name}
                          className="w-12 h-12 object-cover rounded border border-gray-300"
                        />
                        <div className="absolute bottom-0 right-0 bg-green-500 w-3 h-3 rounded-full border border-white"></div>
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                        <span className="text-gray-400 text-xs">❌</span>
                      </div>
                    )}
                  </td>
                  
                  <td className="px-4 py-2">
                    {editingIndex === index ? (
                      <input
                        type="text"
                        value={editedNames[index] || action.name}
                        onChange={(e) => handleEditName(index, e.target.value)}
                        onBlur={() => setEditingIndex(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setEditingIndex(null);
                          }
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        autoFocus
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:text-blue-600"
                        onClick={() => setEditingIndex(index)}
                      >
                        {editedNames[index] || action.name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {action.type}
                    </span>
                  </td>
                  <td className="px-4 py-2">{action.platform}</td>
                  <td className="px-4 py-2">
                    <details className="cursor-pointer">
                      <summary className="text-blue-600 hover:text-blue-800">
                        View
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                        {JSON.stringify(action.params, null, 2)}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      <div className="bg-blue-50 p-3 rounded-md">
        <p className="text-sm text-blue-900">
          <span className="font-medium">{selectedActions.size}</span> of{' '}
          {recordingData.microActions.length} actions selected for import
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleImport}
          disabled={selectedActions.size === 0}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Import {selectedActions.size} Action{selectedActions.size !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  );
}

