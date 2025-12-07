import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Sidebar from "./dashboard/sidebar";
import DashboardNavbar from "@components/DashboardNavbar";
import { getJson, deleteJson } from "@utils/api";
import { toast } from "react-toastify";

export default function Clients() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clients, setClients] = useState([]);
  const [showDownloadSuccess, setShowDownloadSuccess] = useState(false);
  const [deletingClientId, setDeletingClientId] = useState(null);

  useEffect(() => {
    // Check if user just downloaded the ZIP
    if (typeof window !== 'undefined') {
      const isDownloaded = localStorage.getItem('isDownloaded');
      if (isDownloaded === 'true') {
        setShowDownloadSuccess(true);
        // Clear the flag
        localStorage.removeItem('isDownloaded');
      }
    }
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getJson("/api/clients/list");
      // Handle both placeholder response and actual data
      if (response.message === "list endpoint") {
        setClients([]);
      } else {
        setClients(response.clients || response || []);
      }
    } catch (err) {
      setError(err.message || "Failed to load clients");
      toast.error(err.message || "Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "online":
        return "bg-green-100 text-green-800";
      case "installed":
        return "bg-blue-100 text-blue-800";
      case "sleeping":
        return "bg-yellow-100 text-yellow-800";
      case "error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPlatformIcon = (platform) => {
    switch (platform?.toLowerCase()) {
      case "win32":
        return "🪟";
      case "darwin":
        return "🍎";
      case "linux":
        return "🐧";
      default:
        return "💻";
    }
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return "Never";
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
  };

  const handleDelete = async (e, clientId) => {
    e.stopPropagation(); // Prevent card click event

    if (!window.confirm("Are you sure you want to delete this client? This action cannot be undone.")) {
      return;
    }

    try {
      setDeletingClientId(clientId);
      await deleteJson(`/api/clients/${clientId}`);
      toast.success("Client deleted successfully");
      // Refresh the clients list
      await fetchClients();
    } catch (err) {
      toast.error(err.message || "Failed to delete client");
    } finally {
      setDeletingClientId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-56 p-6">
          {/* Header */}
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage your installed client agents
            </p>
          </header>

          {/* Loading State */}
          {loading && (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <p className="mt-2 text-gray-600">Loading clients...</p>
            </div>
          )}

          {/* Download Success Message */}
          {showDownloadSuccess && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded mb-6">
              <div className="flex items-start">
                <span className="text-xl mr-2">✅</span>
                <div className="flex-1">
                  <p className="font-semibold mb-1">Developer ZIP Downloaded Successfully!</p>
                  <p className="text-sm">
                    Extract the ZIP file to any location, then run <code className="bg-blue-100 px-1 rounded">start_agent.bat</code>.
                    The agent will automatically register itself with the server when it starts.
                  </p>
                  <p className="text-sm mt-2 font-medium">
                    💡 <strong>Tip:</strong> Refresh this page after the installation is done to see your agent appear here.
                  </p>
                </div>
                <button
                  onClick={() => setShowDownloadSuccess(false)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Clients List */}
          {!loading && !error && (
            <>
              {clients.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <div className="text-6xl mb-4">📦</div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    No Agents Running
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Download and run the developer ZIP to start your agent
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    The agent will automatically register itself when it starts running.
                    You don't need to manually specify the installation directory.
                  </p>
                  <a
                    href="/settings/install"
                    className="inline-block mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Download Developer ZIP →
                  </a>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {clients.map((client) => (
                    <div
                      key={client.id || client.client_id}
                      onClick={() => router.push(`/clients/${client.id}`)}
                      className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer relative"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <span className="text-3xl">
                            {getPlatformIcon(client.platform)}
                          </span>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {client.client_name || client.client_id || "Unnamed Client"}
                            </h3>
                            {client.platform && (
                              <p className="text-sm text-gray-600 capitalize">
                                {client.platform}
                                {client.os_version && ` • ${client.os_version}`}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                              client.status
                            )}`}
                          >
                            {client.status || "Unknown"}
                          </span>
                          <button
                            onClick={(e) => handleDelete(e, client.id)}
                            disabled={deletingClientId === client.id}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete client"
                          >
                            {deletingClientId === client.id ? (
                              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        {client.agent_version && (
                          <p className="text-xs text-gray-500">
                            Version: {client.agent_version}
                          </p>
                        )}
                        {client.last_seen && (
                          <p className="text-xs text-gray-500">
                            Last seen: {formatLastSeen(client.last_seen)}
                          </p>
                        )}
                        {client.last_heartbeat && (
                          <p className="text-xs text-gray-500">
                            Last heartbeat: {formatLastSeen(client.last_heartbeat)}
                          </p>
                        )}
                        {client.total_jobs !== undefined && (
                          <p className="text-xs text-gray-500">
                            Total jobs: {client.total_jobs}
                          </p>
                        )}
                        {client.installed_at && (
                          <p className="text-xs text-gray-500">
                            Installed:{" "}
                            {new Date(client.installed_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      {client.install_path && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-xs text-gray-500 truncate" title={client.install_path}>
                            📁 {client.install_path}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

