import { useState } from 'react';

const typeColors = {
  auth: 'bg-blue-100 text-blue-800',
  post: 'bg-green-100 text-green-800',
  story: 'bg-purple-100 text-purple-800',
  comment: 'bg-yellow-100 text-yellow-800',
  like: 'bg-pink-100 text-pink-800',
};

const platformColors = {
  instagram: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
  facebook: 'bg-blue-600 text-white',
  twitter: 'bg-blue-400 text-white',
};

export default function WorkflowCard({ workflow, onEdit, onDelete }) {
  const [showSteps, setShowSteps] = useState(false);

  const stepCount = workflow.steps?.length || 0;
  const hasAuthWorkflow = workflow.auth_workflow_id !== null;

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
            {workflow.name}
          </h3>
          {workflow.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {workflow.description}
            </p>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[workflow.type] || 'bg-gray-100 text-gray-800'}`}
        >
          {workflow.type}
        </span>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${platformColors[workflow.platform] || 'bg-gray-100 text-gray-800'}`}
        >
          {workflow.platform}
        </span>
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {stepCount} {stepCount === 1 ? 'step' : 'steps'}
        </span>
        {workflow.requires_auth && (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            Requires Auth
          </span>
        )}
        {!workflow.is_active && (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Inactive
          </span>
        )}
      </div>

      {/* Steps Preview */}
      {stepCount > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setShowSteps(!showSteps)}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 w-full"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showSteps ? 'rotate-90' : ''}`}
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
            {showSteps ? 'Hide' : 'Show'} Steps ({stepCount})
          </button>
          {showSteps && (
            <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
              {workflow.steps.map((step, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded p-2 text-xs border border-gray-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">
                        {index + 1}. {step.micro_action?.name || 'Unknown Action'}
                      </div>
                      {step.micro_action && (
                        <div className="flex gap-1 mt-1">
                          <span className="px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                            {step.micro_action.type}
                          </span>
                          {step.params_override && Object.keys(step.params_override).length > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">
                              Override
                            </span>
                          )}
                        </div>
                      )}
                      {step.params_override && Object.keys(step.params_override).length > 0 && (
                        <div className="mt-1 text-gray-600">
                          <span className="font-medium">Overrides:</span>{' '}
                          {Object.entries(step.params_override)
                            .map(([key, value]) => {
                              const displayValue =
                                typeof value === 'string' && value.length > 30
                                  ? value.substring(0, 30) + '...'
                                  : String(value);
                              return `${key}: ${displayValue}`;
                            })
                            .join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Metadata */}
      <div className="text-xs text-gray-500 mb-3">
        <div>Version: {workflow.version || '1.0.0'}</div>
        {workflow.created_at && (
          <div>
            Created: {new Date(workflow.created_at).toLocaleDateString()}
          </div>
        )}
        {hasAuthWorkflow && (
          <div className="text-orange-600 mt-1">
            Auth Workflow: {workflow.auth_workflow_id}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-200">
        <button
          onClick={() => onEdit(workflow)}
          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(workflow)}
          className="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

