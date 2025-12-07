import { useState, useEffect } from "react";
import Sidebar from "./dashboard/sidebar";
import DashboardNavbar from "@components/DashboardNavbar";
import { getJson, postJson, deleteJson } from "@utils/api";
import { toast } from "react-toastify";
import { 
  encryptAccountPassword, 
  encryptAccountPasswordWithClientKey,
  decryptClientEncryptionKey 
} from "@modules-view/utils/encryption";

export default function Accounts() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [clients, setClients] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [filters, setFilters] = useState({ platform: "", status: "" });

  const [newAccount, setNewAccount] = useState({
    platform: "instagram",
    username: "",
    password: "",
    clientId: "",
  });

  useEffect(() => {
    fetchAccounts();
    fetchClients();
  }, [filters]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filters.platform) params.append("platform", filters.platform);
      if (filters.status) params.append("status", filters.status);

      const queryString = params.toString();
      const response = await getJson(
        `/api/accounts/list${queryString ? `?${queryString}` : ""}`
      );
      setAccounts(response.accounts || []);
    } catch (err) {
      setError(err.message || "Failed to load accounts");
      toast.error(err.message || "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await getJson("/api/clients/list");
      setClients(response.clients || []);
    } catch (err) {
      console.error("Failed to load clients:", err);
      // Don't show error toast for clients - it's not critical
    }
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!newAccount.username || !newAccount.password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!newAccount.clientId) {
      toast.error("Please select a client");
      return;
    }

    try {
      setAdding(true);
      
      // Get client encryption key
      const authToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      if (!authToken) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Get user ID from token (simplified - in production, decode JWT properly)
      const userResponse = await getJson('/api/auth/me');
      const userId = userResponse.id;
      if (!userId) {
        throw new Error('Unable to get user ID');
      }

      // Get encrypted encryption key from server
      const keyResponse = await getJson(`/api/clients/${newAccount.clientId}/encryption-key`);
      if (!keyResponse.encryptedKey) {
        throw new Error('Failed to get client encryption key');
      }

      // Decrypt client encryption key
      const clientEncryptionKey = await decryptClientEncryptionKey(
        keyResponse.encryptedKey,
        authToken,
        userId
      );

      // Encrypt password using client's encryption key
      const encryptedPassword = await encryptAccountPasswordWithClientKey(
        newAccount.password,
        clientEncryptionKey
      );
      
      const response = await postJson("/api/accounts/add", {
        platform: newAccount.platform,
        username: newAccount.username,
        encryptedPassword: encryptedPassword,
        clientId: newAccount.clientId,
      });

      toast.success("Account added successfully.");
      setShowAddModal(false);
      setNewAccount({ platform: "instagram", username: "", password: "", clientId: "" });
      fetchAccounts();
    } catch (err) {
      toast.error(err.message || "Failed to add account");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (accountId) => {
    if (!confirm("Are you sure you want to delete this account?")) {
      return;
    }

    try {
      await deleteJson(`/api/accounts/${accountId}`);
      toast.success("Account deleted successfully");
      fetchAccounts();
    } catch (err) {
      toast.error(err.message || "Failed to delete account");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "pending_verification":
        return "bg-yellow-100 text-yellow-800";
      case "login_failed":
        return "bg-red-100 text-red-800";
      case "needs_reauth":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPlatformIcon = (platform) => {
    switch (platform?.toLowerCase()) {
      case "instagram":
        return "📷";
      case "facebook":
        return "👥";
      case "twitter":
        return "🐦";
      default:
        return "🌐";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-56 p-6">
          {/* Header */}
          <header className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Accounts</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage your social media accounts
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <span>+</span>
              <span>Add Account</span>
            </button>
          </header>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex gap-4">
            <select
              value={filters.platform}
              onChange={(e) =>
                setFilters({ ...filters, platform: e.target.value })
              }
              className="border border-gray-300 rounded px-3 py-2"
            >
              <option value="">All Platforms</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="twitter">Twitter</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className="border border-gray-300 rounded px-3 py-2"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending_verification">Pending Verification</option>
              <option value="login_failed">Login Failed</option>
              <option value="needs_reauth">Needs Re-auth</option>
            </select>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <p className="mt-2 text-gray-600">Loading accounts...</p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Accounts List */}
          {!loading && !error && (
            <>
              {accounts.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <p className="text-gray-600 mb-4">No accounts found</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Add your first account
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <span className="text-3xl">
                            {getPlatformIcon(account.platform)}
                          </span>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 capitalize">
                              {account.platform}
                            </h3>
                            <p className="text-sm text-gray-600">
                              @{account.username}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                            account.status
                          )}`}
                        >
                          {account.status?.replace("_", " ")}
                        </span>
                      </div>

                      <div className="space-y-2 mb-4">
                        {account.last_verified_at && (
                          <p className="text-xs text-gray-500">
                            Verified:{" "}
                            {new Date(account.last_verified_at).toLocaleDateString()}
                          </p>
                        )}
                        {account.last_used_at && (
                          <p className="text-xs text-gray-500">
                            Last used:{" "}
                            {new Date(account.last_used_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(account.id)}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Add Account Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Add Account
                </h2>
                <form onSubmit={handleAddAccount}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newAccount.clientId}
                      onChange={(e) =>
                        setNewAccount({ ...newAccount, clientId: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      required
                    >
                      <option value="">Select a client...</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.client_name || client.client_id} {client.status === 'online' ? '🟢' : ''}
                        </option>
                      ))}
                    </select>
                    {clients.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        No clients available. Please install a client agent first.
                      </p>
                    )}
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Platform
                    </label>
                    <select
                      value={newAccount.platform}
                      onChange={(e) =>
                        setNewAccount({ ...newAccount, platform: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      required
                    >
                      <option value="instagram">Instagram</option>
                      <option value="facebook">Facebook</option>
                      <option value="twitter">Twitter</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={newAccount.username}
                      onChange={(e) =>
                        setNewAccount({ ...newAccount, username: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={newAccount.password}
                      onChange={(e) =>
                        setNewAccount({ ...newAccount, password: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      required
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        setNewAccount({
                          platform: "instagram",
                          username: "",
                          password: "",
                          clientId: "",
                        });
                      }}
                      className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 transition-colors"
                      disabled={adding}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                      disabled={adding}
                    >
                      {adding ? "Adding..." : "Add Account"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
