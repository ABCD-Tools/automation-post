import { useState, useEffect } from 'react';
import { getJson } from '@utils/api';

const platforms = ['instagram', 'facebook', 'twitter'];
const workflowTypes = ['auth', 'post', 'story', 'comment', 'like'];

export default function WorkflowForm({ workflow, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    platform: 'instagram',
    type: 'auth',
    steps: [],
    requires_auth: false,
    auth_workflow_id: null,
  });
  const [errors, setErrors] = useState({});
  const [microActions, setMicroActions] = useState([]);
  const [availableWorkflows, setAvailableWorkflows] = useState([]);
  const [loadingMicroActions, setLoadingMicroActions] = useState(false);

  useEffect(() => {
    if (workflow) {
      setFormData({
        name: workflow.name || '',
        description: workflow.description || '',
        platform: workflow.platform || 'instagram',
        type: workflow.type || 'auth',
        steps: workflow.steps || [],
        requires_auth: workflow.requires_auth || false,
        auth_workflow_id: workflow.auth_workflow_id || null,
      });
    }
  }, [workflow]);

  // Load micro-actions for the selected platform
  useEffect(() => {
    loadMicroActions();
  }, [formData.platform]);

  // Load available workflows for auth_workflow_id selection
  useEffect(() => {
    loadAvailableWorkflows();
  }, []);

  const loadMicroActions = async () => {
    try {
      setLoadingMicroActions(true);
      const params = new URLSearchParams();
      params.append('platform', formData.platform === 'all' ? 'all' : formData.platform);
      params.append('page', '1');
      params.append('limit', '1000'); // Get all for dropdown
      const data = await getJson(`/api/admin/micro-actions/list?${params.toString()}`);
      setMicroActions(data.microActions || []);
    } catch (err) {
      console.error('Error loading micro-actions:', err);
    } finally {
      setLoadingMicroActions(false);
    }
  };

  const loadAvailableWorkflows = async () => {
    try {
      const params = new URLSearchParams();
      params.append('platform', formData.platform);
      params.append('type', 'auth'); // Only show auth workflows
      params.append('page', '1');
      params.append('limit', '100');
      const data = await getJson(`/api/admin/workflows/list?${params.toString()}`);
      // Filter out current workflow if editing
      const filtered = workflow
        ? data.workflows.filter((w) => w.id !== workflow.id)
        : data.workflows;
      setAvailableWorkflows(filtered || []);
    } catch (err) {
      console.error('Error loading workflows:', err);
    }
  };

  const addStep = () => {
    setFormData((prev) => ({
      ...prev,
      steps: [...prev.steps, { micro_action_id: '', params_override: {} }],
    }));
  };

  const removeStep = (index) => {
    setFormData((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
    }));
  };

  const updateStep = (index, field, value) => {
    setFormData((prev) => {
      const newSteps = [...prev.steps];
      if (field === 'micro_action_id') {
        newSteps[index] = { ...newSteps[index], micro_action_id: value };
      } else if (field === 'params_override') {
        newSteps[index] = { ...newSteps[index], params_override: value };
      } else {
        newSteps[index] = { ...newSteps[index], [field]: value };
      }
      return { ...prev, steps: newSteps };
    });
  };

  const moveStep = (index, direction) => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === formData.steps.length - 1)
    ) {
      return;
    }
    setFormData((prev) => {
      const newSteps = [...prev.steps];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newSteps[index], newSteps[targetIndex]] = [
        newSteps[targetIndex],
        newSteps[index],
      ];
      return { ...prev, steps: newSteps };
    });
  };

  const updateParamOverride = (stepIndex, key, value) => {
    setFormData((prev) => {
      const newSteps = [...prev.steps];
      const step = newSteps[stepIndex];
      const paramsOverride = { ...step.params_override };
      if (value === '' || value === null) {
        delete paramsOverride[key];
      } else {
        paramsOverride[key] = value;
      }
      step.params_override = paramsOverride;
      return { ...prev, steps: newSteps };
    });
  };

  const getSelectedMicroAction = (microActionId) => {
    return microActions.find((ma) => ma.id === microActionId);
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.platform) {
      newErrors.platform = 'Platform is required';
    }

    if (!formData.type) {
      newErrors.type = 'Type is required';
    }

    if (!formData.steps || formData.steps.length === 0) {
      newErrors.steps = 'At least one step is required';
    } else {
      formData.steps.forEach((step, index) => {
        if (!step.micro_action_id) {
          newErrors[`step_${index}`] = 'Micro-action is required';
        }
      });
    }

    if (formData.requires_auth && !formData.auth_workflow_id) {
      newErrors.auth_workflow_id = 'Auth workflow is required when requires_auth is true';
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Basic Fields */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name ? 'border-red-500' : 'border-gray-300'
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
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
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
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.platform ? 'border-red-500' : 'border-gray-300'
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
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.type ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            {workflowTypes.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Auth Workflow */}
      <div className="space-y-2">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="requires_auth"
            checked={formData.requires_auth}
            onChange={(e) =>
              setFormData({
                ...formData,
                requires_auth: e.target.checked,
                auth_workflow_id: e.target.checked ? formData.auth_workflow_id : null,
              })
            }
            className="mr-2"
          />
          <label htmlFor="requires_auth" className="text-sm text-gray-700">
            Requires Authentication
          </label>
        </div>
        {formData.requires_auth && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Auth Workflow *
            </label>
            <select
              value={formData.auth_workflow_id || ''}
              onChange={(e) =>
                setFormData({ ...formData, auth_workflow_id: e.target.value || null })
              }
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.auth_workflow_id ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select auth workflow...</option>
              {availableWorkflows.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.platform})
                </option>
              ))}
            </select>
            {errors.auth_workflow_id && (
              <p className="mt-1 text-sm text-red-600">{errors.auth_workflow_id}</p>
            )}
          </div>
        )}
      </div>

      {/* Steps */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Steps * {errors.steps && <span className="text-red-600">({errors.steps})</span>}
          </label>
          <button
            type="button"
            onClick={addStep}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Add Step
          </button>
        </div>

        {formData.steps.length === 0 && (
          <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded border border-gray-200">
            No steps added. Click "Add Step" to add micro-actions to this workflow.
          </div>
        )}

        <div className="space-y-3">
          {formData.steps.map((step, index) => {
            const selectedAction = getSelectedMicroAction(step.micro_action_id);
            const errorKey = `step_${index}`;

            return (
              <div
                key={index}
                className="border border-gray-300 rounded-lg p-4 bg-gray-50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">
                      Step {index + 1}
                    </span>
                    {errors[errorKey] && (
                      <span className="text-xs text-red-600">{errors[errorKey]}</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveStep(index, 'up')}
                      disabled={index === 0}
                      className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStep(index, 'down')}
                      disabled={index === formData.steps.length - 1}
                      className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStep(index)}
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Micro-Action *
                    </label>
                    <select
                      value={step.micro_action_id}
                      onChange={(e) =>
                        updateStep(index, 'micro_action_id', e.target.value)
                      }
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors[errorKey] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      disabled={loadingMicroActions}
                    >
                      <option value="">Select micro-action...</option>
                      {microActions.map((ma) => (
                        <option key={ma.id} value={ma.id}>
                          {ma.name} ({ma.type}) - {ma.platform}
                        </option>
                      ))}
                    </select>
                    {selectedAction && (
                      <p className="mt-1 text-xs text-gray-500">
                        {selectedAction.description || 'No description'}
                      </p>
                    )}
                  </div>

                  {/* Parameter Overrides */}
                  {selectedAction && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Parameter Overrides (Optional)
                      </label>
                      <div className="bg-white rounded border border-gray-300 p-3 space-y-2">
                        {selectedAction.type === 'type' && (
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              Text
                            </label>
                            <input
                              type="text"
                              value={step.params_override?.text || ''}
                              onChange={(e) =>
                                updateParamOverride(index, 'text', e.target.value)
                              }
                              placeholder={selectedAction.params?.text || 'Enter text...'}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                        )}
                        {selectedAction.type === 'navigate' && (
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              URL
                            </label>
                            <input
                              type="text"
                              value={step.params_override?.url || ''}
                              onChange={(e) =>
                                updateParamOverride(index, 'url', e.target.value)
                              }
                              placeholder={selectedAction.params?.url || 'Enter URL...'}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                        )}
                        {selectedAction.type === 'wait' && (
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              Duration (ms)
                            </label>
                            <input
                              type="number"
                              value={step.params_override?.duration || ''}
                              onChange={(e) =>
                                updateParamOverride(
                                  index,
                                  'duration',
                                  e.target.value ? parseInt(e.target.value) : '',
                                )
                              }
                              placeholder={selectedAction.params?.duration || 'Enter duration...'}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                        )}
                        {/* JSON Editor for complex overrides */}
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            Custom Overrides (JSON)
                          </label>
                          <textarea
                            value={
                              JSON.stringify(step.params_override || {}, null, 2)
                            }
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value);
                                updateStep(index, 'params_override', parsed);
                              } catch (err) {
                                // Invalid JSON, ignore
                              }
                            }}
                            rows={3}
                            className="w-full px-2 py-1 text-xs font-mono border border-gray-300 rounded"
                            placeholder='{"key": "value"}'
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
          {workflow ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}

