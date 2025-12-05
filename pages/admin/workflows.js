import { useState, useEffect, useCallback } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { getJson, postJson } from '@utils/api';
import Modal from '@components/Modal';
import WorkflowCard from '@components/admin/WorkflowCard';
import WorkflowForm from '@components/admin/WorkflowForm';

const platforms = ['all', 'instagram', 'facebook', 'twitter'];
const workflowTypes = ['all', 'auth', 'post', 'story', 'comment', 'like'];

export default function Workflows() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    platform: 'all',
    type: 'all',
  });
  const [showForm, setShowForm] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState(null);

  // Fetch workflows
  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.platform !== 'all') params.append('platform', filters.platform);
      if (filters.type !== 'all') params.append('type', filters.type);
      params.append('page', '1');
      params.append('limit', '100');

      const data = await getJson(`/api/admin/workflows/list?${params.toString()}`);
      setWorkflows(data.workflows || []);
    } catch (err) {
      console.error('Error fetching workflows:', err);
      setError(err.message || 'Failed to load workflows');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  // Handle create/update
  const handleSave = async (formData) => {
    try {
      if (editingWorkflow) {
        // Update
        await postJson(`/api/admin/workflows/${editingWorkflow.id}`, formData, 'PUT');
      } else {
        // Create
        await postJson('/api/admin/workflows/create', formData);
      }
      setShowForm(false);
      setEditingWorkflow(null);
      fetchWorkflows();
    } catch (err) {
      console.error('Error saving workflow:', err);
      alert(err.message || 'Failed to save workflow');
    }
  };

  // Handle delete
  const handleDeleteClick = (workflow) => {
    setWorkflowToDelete(workflow);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!workflowToDelete) return;

    try {
      await postJson(`/api/admin/workflows/${workflowToDelete.id}`, {}, 'DELETE');
      setDeleteDialogOpen(false);
      setWorkflowToDelete(null);
      fetchWorkflows();
    } catch (err) {
      console.error('Error deleting workflow:', err);
      alert(err.message || 'Failed to delete workflow');
      setDeleteDialogOpen(false);
      setWorkflowToDelete(null);
    }
  };

  // Handle edit
  const handleEdit = async (workflow) => {
    try {
      // Fetch full workflow with populated micro-actions
      const fullWorkflow = await getJson(`/api/admin/workflows/${workflow.id}`);
      setEditingWorkflow(fullWorkflow);
      setShowForm(true);
    } catch (err) {
      console.error('Error loading workflow:', err);
      alert(err.message || 'Failed to load workflow');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Workflows</h1>
            <p className="text-sm text-gray-600 mt-1">
              Create and manage automation workflows using micro-actions
            </p>
          </div>
          <button
            onClick={() => {
              setEditingWorkflow(null);
              setShowForm(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            + Create Workflow
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                {workflowTypes.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
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
            <p className="mt-2 text-gray-600">Loading workflows...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && workflows.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg">
              No workflows found. Create one to get started!
            </p>
            <button
              onClick={() => {
                setEditingWorkflow(null);
                setShowForm(true);
              }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Your First Workflow
            </button>
          </div>
        )}

        {/* Grid */}
        {!loading && workflows.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflows.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        )}

        {/* Form Modal */}
        <Modal
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingWorkflow(null);
          }}
          title={editingWorkflow ? 'Edit Workflow' : 'Create Workflow'}
          size="xl"
        >
          <WorkflowForm
            workflow={editingWorkflow}
            onClose={() => {
              setShowForm(false);
              setEditingWorkflow(null);
            }}
            onSave={handleSave}
          />
        </Modal>

        {/* Delete Confirmation Dialog */}
        <AlertDialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
            <AlertDialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 z-50 max-w-md w-full mx-4">
              <AlertDialog.Title className="text-lg font-semibold text-gray-900 mb-2">
                Delete Workflow
              </AlertDialog.Title>
              <AlertDialog.Description className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete "{workflowToDelete?.name}"? This action
                cannot be undone.
              </AlertDialog.Description>
              <div className="flex justify-end gap-3">
                <AlertDialog.Cancel asChild>
                  <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                </AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                  <button
                    onClick={handleDeleteConfirm}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      </div>
    </div>
  );
}
