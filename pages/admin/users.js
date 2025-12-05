import { useState, useEffect, useCallback } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { getJson, postJson } from '@utils/api';
import DashboardNavbar from '@components/DashboardNavbar';

const tiers = ['all', 'free', 'pro', 'enterprise', 'admin', 'superadmin'];

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [filters, setFilters] = useState({
    tier: 'all',
    search: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    total: 0,
  });

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput }));
      setPagination((prev) => ({ ...prev, offset: 0 })); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.tier !== 'all') params.append('tier', filters.tier);
      if (filters.search) params.append('search', filters.search);
      params.append('limit', pagination.limit.toString());
      params.append('offset', pagination.offset.toString());

      const data = await getJson(`/api/admin/users/list?${params.toString()}`);
      setUsers(data.users || []);
      setPagination((prev) => ({
        ...prev,
        total: data.total || 0,
        count: data.count || 0,
      }));
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit, pagination.offset]);

  // Fetch statistics
  const fetchStatistics = useCallback(async () => {
    try {
      const data = await getJson('/api/admin/users/statistics');
      setStatistics(data);
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  }, []);

  // Fetch current user ID
  const fetchCurrentUser = useCallback(async () => {
    try {
      const userData = await getJson('/api/auth/me');
      const userId = userData?.id || null;
      setCurrentUserId(userId);
    } catch (err) {
      console.error('Error fetching current user:', err);
      setCurrentUserId(null);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchStatistics();
    fetchCurrentUser();
  }, [fetchUsers, fetchStatistics, fetchCurrentUser]);

  // Handle edit
  const handleEditClick = (user) => {
    // Safety check: prevent editing own account
    if (currentUserId && user.id === currentUserId) {
      alert('Cannot edit your own account. Use profile settings instead.');
      return;
    }
    setEditingUser(user);
    setShowEditModal(true);
  };

  const handleSave = async (formData) => {
    try {
      await postJson(`/api/admin/users/${editingUser.id}`, formData, 'PUT');
      setShowEditModal(false);
      setEditingUser(null);
      fetchUsers();
      fetchStatistics();
    } catch (err) {
      console.error('Error saving user:', err);
      alert(err.message || 'Failed to save user');
    }
  };

  // Handle delete
  const handleDeleteClick = (user) => {
    // Safety check: prevent deleting own account
    if (currentUserId && user.id === currentUserId) {
      alert('Cannot delete your own account.');
      return;
    }
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      await postJson(`/api/admin/users/${userToDelete.id}`, {}, 'DELETE');
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
      fetchStatistics();
    } catch (err) {
      console.error('Error deleting user:', err);
      alert(err.message || 'Failed to delete user');
    }
  };

  const handlePageChange = (newOffset) => {
    setPagination((prev) => ({ ...prev, offset: newOffset }));
  };

  const UserCard = ({ user }) => {
    const tierColors = {
      free: 'bg-gray-100 text-gray-800',
      pro: 'bg-blue-100 text-gray-800',
      enterprise: 'bg-purple-100 text-purple-800',
      admin: 'bg-orange-100 text-orange-800',
      superadmin: 'bg-red-100 text-red-800',
    };

    // Check if this is the current user (strict string comparison to handle UUIDs)
    // Convert both to strings and compare (handles null/undefined cases)
    const userStr = user?.id ? String(user.id).trim() : '';
    const currentStr = currentUserId ? String(currentUserId).trim() : '';
    const isCurrentUser = currentStr !== '' && userStr !== '' && userStr === currentStr;

    return (
      <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{user.email}</h3>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  tierColors[user.tier] || tierColors.free
                }`}
              >
                {user.tier || 'free'}
              </span>
              {user.emailVerified && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                  ✓ Verified
                </span>
              )}
              {!user.isActive && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                  Banned
                </span>
              )}
              {isCurrentUser && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  You
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>ID: {user.id}</p>
              {user.lastSignInAt && (
                <p>Last sign in: {new Date(user.lastSignInAt).toLocaleDateString()}</p>
              )}
              <p>Created: {new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {isCurrentUser ? (
            <div className="text-sm text-gray-500 italic px-4 py-2 bg-gray-100 rounded">
              Cannot edit or delete your own account
            </div>
          ) : (
            <>
              <button
                onClick={() => handleEditClick(user)}
                disabled={isCurrentUser}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteClick(user)}
                disabled={isCurrentUser}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const EditUserModal = () => {
    const [formData, setFormData] = useState({
      email: editingUser?.email || '',
      tier: editingUser?.tier || 'free',
      emailVerified: editingUser?.emailVerified || false,
      isActive: editingUser?.isActive !== false,
    });

    useEffect(() => {
      if (editingUser) {
        setFormData({
          email: editingUser.email || '',
          tier: editingUser.tier || 'free',
          emailVerified: editingUser.emailVerified || false,
          isActive: editingUser.isActive !== false,
        });
      }
    }, [editingUser]);

    return (
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${
          showEditModal ? '' : 'hidden'
        }`}
        onClick={() => setShowEditModal(false)}
      >
        <div
          className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold mb-4">Edit User</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
              <select
                value={formData.tier}
                onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="emailVerified"
                checked={formData.emailVerified}
                onChange={(e) => setFormData({ ...formData, emailVerified: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="emailVerified" className="text-sm font-medium text-gray-700">
                Email Verified
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Active (Not Banned)
              </label>
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => handleSave(formData)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
            >
              Save
            </button>
            <button
              onClick={() => {
                setShowEditModal(false);
                setEditingUser(null);
              }}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />
      <div className="pt-16 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                <p className="text-sm text-gray-600 mt-1">Manage platform users and permissions</p>
              </div>
            </div>
          </header>

          {/* Statistics */}
          {statistics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{statistics.total}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{statistics.active}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-sm font-medium text-gray-600">Verified Users</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{statistics.verified}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-sm font-medium text-gray-600">Recent (7 days)</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{statistics.recent}</p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <input
                  type="text"
                  placeholder="Search by email..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tier</label>
                <select
                  value={filters.tier}
                  onChange={(e) => {
                    setFilters({ ...filters, tier: e.target.value });
                    setPagination((prev) => ({ ...prev, offset: 0 }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {tiers.map((tier) => (
                    <option key={tier} value={tier}>
                      {tier.charAt(0).toUpperCase() + tier.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <p className="mt-2 text-gray-600">Loading users...</p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Users List */}
          {!loading && !error && (
            <>
              <div className="grid grid-cols-1 gap-6 mb-6">
                {users.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    <p className="text-gray-600">No users found</p>
                  </div>
                ) : (
                  users.map((user) => <UserCard key={user.id} user={user} />)
                )}
              </div>

              {/* Pagination */}
              {pagination.total > pagination.limit && (
                <div className="flex items-center justify-between bg-white rounded-lg shadow-md p-4">
                  <div className="text-sm text-gray-600">
                    Showing {pagination.offset + 1}-
                    {Math.min(pagination.offset + pagination.limit, pagination.total)} of{' '}
                    {pagination.total} users
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(Math.max(0, pagination.offset - pagination.limit))}
                      disabled={pagination.offset === 0}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        handlePageChange(pagination.offset + pagination.limit)
                      }
                      disabled={pagination.offset + pagination.limit >= pagination.total}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Edit Modal */}
          <EditUserModal />

          {/* Delete Dialog */}
          <AlertDialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialog.Portal>
              <AlertDialog.Overlay className="fixed inset-0 bg-black bg-opacity-50" />
              <AlertDialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <AlertDialog.Title className="text-xl font-bold mb-2">
                  Delete User
                </AlertDialog.Title>
                <AlertDialog.Description className="text-gray-600 mb-6">
                  Are you sure you want to delete user <strong>{userToDelete?.email}</strong>? This
                  action cannot be undone and will delete all associated data.
                </AlertDialog.Description>
                <div className="flex gap-2 justify-end">
                  <AlertDialog.Cancel asChild>
                    <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors">
                      Cancel
                    </button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action asChild>
                    <button
                      onClick={handleDeleteConfirm}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
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
    </div>
  );
}

