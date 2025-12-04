import { useState, useEffect, useCallback } from 'react';
import { getJson, postJson } from '@utils/api';
import Modal from '@components/Modal';
import MicroActionCard from '@components/admin/MicroActionCard';
import MicroActionForm from '@components/admin/MicroActionForm';
import ImportRecordingModal from '@components/admin/ImportRecordingModal';

const platforms = ['all', 'instagram', 'facebook', 'twitter'];
const actionTypes = [
  'all',
  'click',
  'type',
  'wait',
  'navigate',
  'upload',
  'extract',
  'scroll',
  'screenshot',
];

export default function MicroActions() {
  const [microActions, setMicroActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    platform: 'all',
    type: 'all',
    search: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingAction, setEditingAction] = useState(null);
  const [importData, setImportData] = useState(null);
  const [error, setError] = useState(null);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput }));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch micro-actions
  const fetchMicroActions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.platform !== 'all') params.append('platform', filters.platform);
      if (filters.type !== 'all') params.append('type', filters.type);
      if (filters.search) params.append('search', filters.search);
      params.append('page', '1');
      params.append('limit', '100');

      const data = await getJson(`/api/admin/micro-actions/list?${params.toString()}`);
      setMicroActions(data.microActions || []);
    } catch (err) {
      console.error('Error fetching micro-actions:', err);
      setError(err.message || 'Failed to load micro-actions');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchMicroActions();
  }, [fetchMicroActions]);

  // Handle create/update
  const handleSave = async (formData) => {
    try {
      if (editingAction) {
        // Update
        await postJson(`/api/admin/micro-actions/${editingAction.id}`, formData, 'PUT');
      } else {
        // Create
        await postJson('/api/admin/micro-actions/create', formData);
      }
      setShowForm(false);
      setEditingAction(null);
      fetchMicroActions();
    } catch (err) {
      console.error('Error saving micro-action:', err);
      alert(err.message || 'Failed to save micro-action');
    }
  };

  // Handle delete
  const handleDelete = async (action) => {
    if (!confirm(`Are you sure you want to delete "${action.name}"?`)) {
      return;
    }

    try {
      await postJson(`/api/admin/micro-actions/${action.id}`, {}, 'DELETE');
      fetchMicroActions();
    } catch (err) {
      console.error('Error deleting micro-action:', err);
      alert(err.message || 'Failed to delete micro-action');
    }
  };

  // Handle edit
  const handleEdit = (action) => {
    setEditingAction(action);
    setShowForm(true);
  };

  // Convert recorded actions to micro-actions format
  const convertRecordedActionsToMicroActions = (recordedActions, platform) => {
    const microActions = [];
    let actionIndex = 1;

    for (const action of recordedActions) {
      // Skip invalid actions
      if (!action.type) continue;

      let microAction = {
        name: '',
        type: action.type,
        platform: platform || 'all',
        params: {},
      };

      switch (action.type) {
        case 'click': {
          // Generate name from visual text or default
          const actionText = action.visual?.text || 'element';
          microAction.name = `Click "${actionText.substring(0, 30)}"`;
          
          // Build params with visual data
          microAction.params = {
            visual: action.visual ? {
              screenshot: action.visual.screenshot || null,
              contextScreenshot: action.visual.contextScreenshot || null,
              text: action.visual.text || '',
              position: action.visual.position || { absolute: { x: 0, y: 0 }, relative: { x: 0, y: 0 } },
              boundingBox: action.visual.boundingBox || { x: 0, y: 0, width: 0, height: 0 },
              surroundingText: action.visual.surroundingText || [],
              timestamp: action.visual.timestamp || action.timestamp,
            } : null,
            backup_selector: action.backup_selector || null,
            execution_method: action.execution_method || 'visual_first',
          };
          break;
        }

        case 'type': {
          const placeholder = action.visual?.placeholder || action.element?.name || 'field';
          microAction.name = `Type in "${placeholder}"`;
          
          microAction.params = {
            visual: action.visual ? {
              screenshot: action.visual.screenshot || null,
              contextScreenshot: action.visual.contextScreenshot || null,
              text: action.visual.text || '',
              placeholder: action.visual.placeholder || '',
              inputType: action.visual.inputType || 'text',
              position: action.visual.position || { absolute: { x: 0, y: 0 }, relative: { x: 0, y: 0 } },
              boundingBox: action.visual.boundingBox || { x: 0, y: 0, width: 0, height: 0 },
              surroundingText: action.visual.surroundingText || [],
              timestamp: action.visual.timestamp || action.timestamp,
            } : null,
            backup_selector: action.backup_selector || null,
            text: action.value || '',
            execution_method: action.execution_method || 'visual_first',
          };
          break;
        }

        case 'navigate': {
          microAction.name = `Navigate to ${action.url || 'URL'}`;
          microAction.params = {
            url: action.url || '',
            waitUntil: action.waitUntil || 'networkidle2',
          };
          // Include visual if available
          if (action.visual) {
            microAction.params.visual = {
              screenshot: action.visual.screenshot || null,
              contextScreenshot: action.visual.contextScreenshot || null,
              timestamp: action.visual.timestamp || action.timestamp,
            };
          }
          break;
        }

        case 'upload': {
          microAction.name = 'Upload file';
          microAction.params = {
            visual: action.visual ? {
              screenshot: action.visual.screenshot || null,
              contextScreenshot: action.visual.contextScreenshot || null,
              text: action.visual.text || '',
              position: action.visual.position || { absolute: { x: 0, y: 0 }, relative: { x: 0, y: 0 } },
              boundingBox: action.visual.boundingBox || { x: 0, y: 0, width: 0, height: 0 },
              surroundingText: action.visual.surroundingText || [],
              timestamp: action.visual.timestamp || action.timestamp,
            } : null,
            backup_selector: action.backup_selector || null,
            filePath: action.filePath || '{{imagePath}}',
            execution_method: action.execution_method || 'visual_first',
          };
          break;
        }

        case 'scroll': {
          microAction.name = `Scroll ${action.direction || 'down'}`;
          microAction.params = {
            direction: action.direction || 'down',
            amount: action.amount || 500,
          };
          break;
        }

        case 'wait': {
          microAction.name = action.name || `Wait ${action.duration || 1000}ms`;
          microAction.params = {
            duration: action.duration || 1000,
            randomize: action.randomize || false,
          };
          break;
        }

        default: {
          // For unknown types, create a basic action
          microAction.name = action.name || `${action.type} Action ${actionIndex}`;
          microAction.params = {
            ...action.params,
            ...(action.visual ? { visual: action.visual } : {}),
            ...(action.backup_selector ? { backup_selector: action.backup_selector } : {}),
            execution_method: action.execution_method || 'visual_first',
          };
          break;
        }
      }

      microActions.push(microAction);
      actionIndex++;
    }

    return microActions;
  };

  // Normalize micro-actions to ensure they have required fields
  const normalizeMicroActions = (actions, platform) => {
    return actions.map((action, index) => {
      // If action already has the correct format, ensure platform is set
      if (action.name && action.type && action.params) {
        return {
          ...action,
          platform: action.platform || platform || 'all',
          // Ensure params exists and is an object
          params: action.params || {},
        };
      }

      // If action has visual at top level, move it to params.visual
      if (action.visual && !action.params?.visual) {
        return {
          name: action.name || `${action.type} Action ${index + 1}`,
          type: action.type,
          platform: action.platform || platform || 'all',
          params: {
            ...(action.params || {}),
            visual: action.visual,
            backup_selector: action.backup_selector || null,
            execution_method: action.execution_method || 'visual_first',
            ...(action.text ? { text: action.text } : {}),
          },
        };
      }

      // Default normalization
      return {
        name: action.name || `${action.type} Action ${index + 1}`,
        type: action.type,
        platform: action.platform || platform || 'all',
        params: action.params || {},
      };
    });
  };

  // Handle import
  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        
        // Check if it's a recorded session format (has recordedActions)
        if (data.recordedActions && Array.isArray(data.recordedActions)) {
          // Convert recorded actions to micro-actions format
          const platform = data.platform || 'all';
          const convertedActions = convertRecordedActionsToMicroActions(
            data.recordedActions,
            platform
          );
          
          // Create normalized data structure
          const normalizedData = {
            ...data,
            microActions: convertedActions,
            platform: platform,
            sessionName: data.sessionId || 'Imported Session',
            url: data.url || '',
          };
          
          setImportData(normalizedData);
        } 
        // Check if it already has microActions (pre-converted format)
        else if (data.microActions && Array.isArray(data.microActions)) {
          // Normalize existing micro-actions to ensure they have required fields
          const platform = data.platform || 'all';
          const normalizedActions = normalizeMicroActions(data.microActions, platform);
          
          const normalizedData = {
            ...data,
            microActions: normalizedActions,
            platform: platform,
          };
          
          setImportData(normalizedData);
        } else {
          alert('Invalid recording file format. Expected "recordedActions" or "microActions" array.');
        }
      } catch (err) {
        console.error('Error parsing file:', err);
        alert('Failed to parse recording file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async (actionsToImport) => {
    try {
      await postJson('/api/admin/micro-actions/import', {
        microActions: actionsToImport,
      });
      setImportData(null);
      fetchMicroActions();
      alert(`Successfully imported ${actionsToImport.length} micro-action(s)`);
    } catch (err) {
      console.error('Error importing:', err);
      alert(err.message || 'Failed to import micro-actions');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Micro-Actions</h1>
          <button
            onClick={() => {
              setEditingAction(null);
              setShowForm(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            + Add Micro-Action
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Platform
              </label>
              <select
                value={filters.platform}
                onChange={(e) =>
                  setFilters({ ...filters, platform: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {actionTypes.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search name or description..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end">
              <label className="w-full">
                <span className="block text-sm font-medium text-gray-700 mb-1">
                  Import Recording
                </span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading micro-actions...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && microActions.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg">
              No micro-actions found. Create one to get started!
            </p>
          </div>
        )}

        {/* Grid */}
        {!loading && microActions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {microActions.map((action) => (
              <MicroActionCard
                key={action.id}
                action={action}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Form Modal */}
        <Modal
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingAction(null);
          }}
          title={editingAction ? 'Edit Micro-Action' : 'Create Micro-Action'}
          size="lg"
        >
          <MicroActionForm
            action={editingAction}
            onClose={() => {
              setShowForm(false);
              setEditingAction(null);
            }}
            onSave={handleSave}
          />
        </Modal>

        {/* Import Modal */}
        <Modal
          isOpen={!!importData}
          onClose={() => setImportData(null)}
          title="Import Recording"
          size="xl"
        >
          <ImportRecordingModal
            recordingData={importData}
            onImport={handleImport}
            onClose={() => setImportData(null)}
          />
        </Modal>
      </div>
    </div>
  );
}
