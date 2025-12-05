import { useState, useEffect } from "react";
import Sidebar from "./dashboard/sidebar";
import DashboardNavbar from "@components/DashboardNavbar";
import { getJson } from "@utils/api";
import { toast } from "react-toastify";

export default function Clients() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clients, setClients] = useState([]);

  useEffect(() => {
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
                  <p className="text-gray-600 mb-4">No clients installed</p>
                  <p className="text-sm text-gray-500">
                    Install a client agent to start automating your posts
                  </p>
                  <a
                    href="/settings/install"
                    className="inline-block mt-4 text-blue-600 hover:text-blue-700"
                  >
                    Go to Installation →
                  </a>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {clients.map((client) => (
                    <div
                      key={client.id || client.client_id}
                      className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
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
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                            client.status
                          )}`}
                        >
                          {client.status || "Unknown"}
                        </span>
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

