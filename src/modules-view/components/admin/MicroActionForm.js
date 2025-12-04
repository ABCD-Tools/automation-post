import { useState, useEffect } from 'react';

const actionTypes = [
  'click',
  'type',
  'wait',
  'navigate',
  'upload',
  'extract',
  'scroll',
  'screenshot',
];

const platforms = ['instagram', 'facebook', 'twitter', 'all'];

export default function MicroActionForm({ action, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    platform: 'instagram',
    type: 'click',
    params: {},
  });
  const [errors, setErrors] = useState({});
  const [showFullScreenshot, setShowFullScreenshot] = useState(false);
  const [showVisualEditor, setShowVisualEditor] = useState(false);

  useEffect(() => {
    if (action) {
      setFormData({
        name: action.name || '',
        description: action.description || '',
        platform: action.platform || 'instagram',
        type: action.type || 'click',
        params: action.params || {},
      });
    }
  }, [action]);

  const updateParam = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      params: { ...prev.params, [key]: value },
    }));
  };

  const updateVisualParam = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      params: {
        ...prev.params,
        visual: {
          ...prev.params.visual,
          [key]: value,
        },
      },
    }));
  };

  const updateVisualPosition = (axis, value) => {
    setFormData((prev) => ({
      ...prev,
      params: {
        ...prev.params,
        visual: {
          ...prev.params.visual,
          position: {
            ...prev.params.visual?.position,
            relative: {
              ...prev.params.visual?.position?.relative,
              [axis]: parseFloat(value) || 0,
            },
          },
        },
      },
    }));
  };

  const handleCopySelector = () => {
    if (formData.params.backup_selector) {
      navigator.clipboard.writeText(formData.params.backup_selector);
      // Could add a toast notification here
    }
  };

  const handleRecaptureVisualData = () => {
    // Open recorder in new window/tab
    // In a real implementation, this would:
    // 1. Open a new window with the recorder
    // 2. Pass the current action context
    // 3. Return the captured visual data
    // For now, show a message
    alert('Re-capture Visual Data feature:\n\nThis will open the recorder tool in a new window.\nAfter capturing, the visual data will be automatically updated.\n\n(Feature implementation pending)');
  };

  const renderParamsEditor = () => {
    const { type, params } = formData;

    switch (type) {
      case 'click':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selector *
              </label>
              <input
                type="text"
                value={params.selector || ''}
                onChange={(e) => updateParam('selector', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="#login-button"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="waitForSelector"
                checked={params.waitForSelector || false}
                onChange={(e) => updateParam('waitForSelector', e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="waitForSelector" className="text-sm text-gray-700">
                Wait for selector to appear
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timeout (ms)
              </label>
              <input
                type="number"
                value={params.timeout || 5000}
                onChange={(e) => updateParam('timeout', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );

      case 'type':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selector *
              </label>
              <input
                type="text"
                value={params.selector || ''}
                onChange={(e) => updateParam('selector', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="input[name='username']"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Text *
              </label>
              <input
                type="text"
                value={params.text || ''}
                onChange={(e) => updateParam('text', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="{{username}}"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type Speed
              </label>
              <select
                value={params.typeSpeed || 'normal'}
                onChange={(e) => updateParam('typeSpeed', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="slow">Slow</option>
                <option value="normal">Normal</option>
                <option value="fast">Fast</option>
                <option value="human">Human</option>
              </select>
            </div>
          </div>
        );

      case 'wait':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (ms) *
              </label>
              <input
                type="number"
                value={params.duration || 1000}
                onChange={(e) => updateParam('duration', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="randomize"
                checked={params.randomize || false}
                onChange={(e) => updateParam('randomize', e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="randomize" className="text-sm text-gray-700">
                Randomize duration (±20%)
              </label>
            </div>
          </div>
        );

      case 'navigate':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL *
              </label>
              <input
                type="text"
                value={params.url || ''}
                onChange={(e) => updateParam('url', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://instagram.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wait Until
              </label>
              <select
                value={params.waitUntil || 'networkidle2'}
                onChange={(e) => updateParam('waitUntil', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="load">Load</option>
                <option value="domcontentloaded">DOMContentLoaded</option>
                <option value="networkidle0">Network Idle 0</option>
                <option value="networkidle2">Network Idle 2</option>
              </select>
            </div>
          </div>
        );

      case 'upload':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selector *
              </label>
              <input
                type="text"
                value={params.selector || ''}
                onChange={(e) => updateParam('selector', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                File Path *
              </label>
              <input
                type="text"
                value={params.filePath || ''}
                onChange={(e) => updateParam('filePath', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="{{imagePath}}"
              />
            </div>
          </div>
        );

      case 'extract':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selector *
              </label>
              <input
                type="text"
                value={params.selector || ''}
                onChange={(e) => updateParam('selector', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Variable Name *
              </label>
              <input
                type="text"
                value={params.variableName || ''}
                onChange={(e) => updateParam('variableName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="postCount"
              />
            </div>
          </div>
        );

      case 'scroll':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Direction *
              </label>
              <select
                value={params.direction || 'down'}
                onChange={(e) => updateParam('direction', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="up">Up</option>
                <option value="down">Down</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (px)
              </label>
              <input
                type="number"
                value={params.amount || 500}
                onChange={(e) => updateParam('amount', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-gray-600">
            No specific params for this action type.
          </div>
        );
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.type) {
      newErrors.type = 'Type is required';
    }

    if (!formData.platform) {
      newErrors.platform = 'Platform is required';
    }

    // Validate params based on type
    if (formData.type === 'click' && !formData.params.selector) {
      newErrors.params = 'Selector is required for click actions';
    }
    if (formData.type === 'type' && (!formData.params.selector || formData.params.text === undefined)) {
      newErrors.params = 'Selector and text are required for type actions';
    }
    if (formData.type === 'wait' && !formData.params.duration) {
      newErrors.params = 'Duration is required for wait actions';
    }
    if (formData.type === 'navigate' && !formData.params.url) {
      newErrors.params = 'URL is required for navigate actions';
    }
    if (formData.type === 'upload' && (!formData.params.selector || !formData.params.filePath)) {
      newErrors.params = 'Selector and filePath are required for upload actions';
    }
    if (formData.type === 'extract' && (!formData.params.selector || !formData.params.variableName)) {
      newErrors.params = 'Selector and variableName are required for extract actions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">      {/* Basic Fields */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Platform *
          </label>
          <select
            value={formData.platform}
            onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.platform ? 'border-red-500' : 'border-gray-300'
              }`}
          >
            {platforms.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type *
          </label>
          <select
            value={formData.type}
            onChange={(e) => {
              setFormData({
                ...formData,
                type: e.target.value,
                params: {}, // Reset params when type changes
              });
            }}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.type ? 'border-red-500' : 'border-gray-300'
              }`}
          >
            {actionTypes.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Params Editor */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Parameters
        </label>
        <div className="bg-gray-50 p-4 rounded-md">{renderParamsEditor()}</div>
        {errors.params && (
          <p className="mt-1 text-sm text-red-600">{errors.params}</p>
        )}
      </div>

      {/* Visual Data Editor */}
      {(formData.type === 'click' || formData.type === 'type') && (
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Visual Data</h3>
              <p className="text-sm text-gray-600">
                Visual recording data for robust element finding
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowVisualEditor(!showVisualEditor)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {showVisualEditor ? 'Hide' : 'Show'}
            </button>
          </div>

          {showVisualEditor && (
            <div className="space-y-6 bg-gray-50 p-4 rounded-md">
              {/* Feature 1: Execution Method Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Execution Method
                </label>
                <select
                  value={formData.params.execution_method || 'selector_first'}
                  onChange={(e) => updateParam('execution_method', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="selector_first">⚡ Selector First (Fast - try DOM selector, fallback to visual)</option>
                  <option value="visual_first">🔍 Visual First (Robust - try visual search, fallback to selector)</option>
                  <option value="visual_only">👁️ Visual Only (Max Robust - ignore selector, always use visual)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {formData.params.execution_method === 'visual_first' &&
                    'Prioritizes visual matching for better resilience to UI changes'}
                  {formData.params.execution_method === 'selector_first' &&
                    'Prioritizes CSS selectors for faster execution'}
                  {formData.params.execution_method === 'visual_only' &&
                    'Uses only visual data, ignoring selectors completely'}
                  {!formData.params.execution_method &&
                    'Default: Selector First'}
                </p>
              </div>

              {/* Feature 5: Backup Selector Display */}
              {formData.params.backup_selector && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Backup Selector
                  </label>
                  <div className="flex gap-2">
                    <code className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-mono text-gray-800 overflow-x-auto">
                      {formData.params.backup_selector}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopySelector}
                      className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                      title="Copy selector"
                    >
                      📋
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Recorded CSS selector (read-only)
                  </p>
                </div>
              )}

              {/* Feature 2: Screenshot Preview Section */}
              {formData.params.visual?.screenshot && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Screenshot Preview
                  </label>
                  <div className="flex items-start gap-3">
                    <img
                      src={formData.params.visual.screenshot}
                      alt="Element screenshot"
                      className="w-32 h-32 rounded border border-gray-300 object-cover cursor-pointer hover:ring-2 hover:ring-blue-500"
                      onClick={() => setShowFullScreenshot(true)}
                    />
                    <div className="flex-1 space-y-2">
                      <p className="text-sm text-gray-600">
                        Recorded screenshot of the target element
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowFullScreenshot(true)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        View Full Size
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Feature 4: Text Override Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Element Text Override
                </label>
                <input
                  type="text"
                  value={formData.params.visual?.text || ''}
                  onChange={(e) => updateVisualParam('text', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Override recognized text (optional)"
                />
                <p className="mt-1 text-xs text-gray-500">
                  The visible text used to identify this element
                </p>
              </div>

              {/* Feature 3: Position Editor */}
              {formData.params.visual?.position?.relative && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position Editor
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        X Position (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={formData.params.visual.position.relative.x || 0}
                        onChange={(e) => updateVisualPosition('x', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Y Position (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={formData.params.visual.position.relative.y || 0}
                        onChange={(e) => updateVisualPosition('y', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Relative position of element center on the page (percentage of viewport)
                  </p>
                </div>
              )}

              {/* Feature 6: Re-capture Visual Data Button */}
              <div className="pt-4 border-t border-gray-300">
                <button
                  type="button"
                  onClick={handleRecaptureVisualData}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                >
                  <span>📸</span>
                  <span>Re-capture Visual Data</span>
                </button>
                <p className="mt-2 text-xs text-gray-500 text-center">
                  Opens the recorder to capture fresh visual data for this element
                </p>
              </div>

              {/* Visual Data Summary */}
              {formData.params.visual && (
                <div className="pt-4 border-t border-gray-300">
                  <p className="text-xs font-medium text-gray-700 mb-2">
                    Visual Data Summary:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2 rounded border border-gray-200">
                      <span className="text-gray-600">Screenshot:</span>{' '}
                      <span className={formData.params.visual.screenshot ? 'text-green-600' : 'text-red-600'}>
                        {formData.params.visual.screenshot ? '✓ Yes' : '✗ No'}
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded border border-gray-200">
                      <span className="text-gray-600">Text:</span>{' '}
                      <span className={formData.params.visual.text ? 'text-green-600' : 'text-red-600'}>
                        {formData.params.visual.text ? '✓ Yes' : '✗ No'}
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded border border-gray-200">
                      <span className="text-gray-600">Position:</span>{' '}
                      <span className={formData.params.visual.position ? 'text-green-600' : 'text-red-600'}>
                        {formData.params.visual.position ? '✓ Yes' : '✗ No'}
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded border border-gray-200">
                      <span className="text-gray-600">Bounding Box:</span>{' '}
                      <span className={formData.params.visual.boundingBox ? 'text-green-600' : 'text-red-600'}>
                        {formData.params.visual.boundingBox ? '✓ Yes' : '✗ No'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* JSON Preview */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Params JSON Preview
        </label>
        <pre className="bg-gray-50 p-3 rounded-md text-xs overflow-x-auto">
          {JSON.stringify(formData.params, null, 2)}
        </pre>
      </div>

      {/* Full Screenshot Modal */}
      {showFullScreenshot && formData.params.visual?.screenshot && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4" onClick={() => setShowFullScreenshot(false)}>
          <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowFullScreenshot(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 text-2xl"
              title="Close"
            >
              ✕
            </button>
            <img
              src={formData.params.visual.screenshot}
              alt="Full screenshot"
              className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          {action ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}


