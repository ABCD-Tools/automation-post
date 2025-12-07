import { useState, useEffect } from "react";
import Sidebar from "../dashboard/sidebar";
import DashboardNavbar from "@components/DashboardNavbar";
import { getJson } from "@utils/api";
import { toast } from "react-toastify";

export default function Agents() {
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
      setError(err.message || "Failed to load agents");
      toast.error(err.message || "Failed to load agents");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "online":
        return "bg-green-100 text-green-800 border-green-200";
      case "installed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "sleeping":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "error":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "online":
        return "🟢";
      case "installed":
        return "🔵";
      case "sleeping":
        return "🟡";
      case "error":
        return "🔴";
      default:
        return "⚪";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
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

  const hasInstalledAgent = clients.length > 0 && clients.some(c => c.install_path);

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-56 p-6">
          {/* Header */}
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Agent Settings</h1>
            <p className="text-sm text-gray-600 mt-1">
              View and manage your installed client agents
            </p>
          </header>

          {/* Installation Status Banner */}
          {hasInstalledAgent ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <span className="text-2xl mr-3">✅</span>
                <div>
                  <h3 className="font-semibold text-green-900">Agent Installed</h3>
                  <p className="text-sm text-green-700">
                    Your agent is installed and ready. You can now add accounts and create posts.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <span className="text-2xl mr-3">⚠️</span>
                <div>
                  <h3 className="font-semibold text-yellow-900">No Agent Installed</h3>
                  <p className="text-sm text-yellow-700">
                    Install an agent to start automating your posts.{" "}
                    <a href="/settings/install" className="underline font-medium">
                      Install Agent →
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <p className="mt-2 text-gray-600">Loading agents...</p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Agents List */}
          {!loading && !error && (
            <>
              {clients.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <div className="text-6xl mb-4">📦</div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    No Agents Installed
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Install a client agent to start automating your social media posts
                  </p>
                  <a
                    href="/settings/install"
                    className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Install Agent
                  </a>
                </div>
              ) : (
                <div className="space-y-6">
                  {clients.map((client) => (
                    <div
                      key={client.id || client.client_id}
                      className="bg-white rounded-lg shadow-md p-6"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-xl font-semibold text-gray-900">
                              {client.client_name || client.client_id || "Unnamed Agent"}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                              client.status
                            )}`}>
                              {getStatusIcon(client.status)} {client.status || "Unknown"}
                            </span>
                          </div>
                          {client.platform && (
                            <p className="text-sm text-gray-600 capitalize">
                              Platform: {client.platform}
                              {client.os_version && ` • ${client.os_version}`}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Installer Directory - Highlighted */}
                      {client.install_path ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                          <div className="flex items-start">
                            <span className="text-2xl mr-3">📁</span>
                            <div className="flex-1">
                              <h4 className="font-semibold text-blue-900 mb-1">
                                Agent Installed At:
                              </h4>
                              <p className="text-sm font-mono text-blue-800 break-all">
                                {client.install_path}
                              </p>
                              <p className="text-xs text-blue-600 mt-2">
                                This directory contains your agent installation. You can now proceed to add accounts and create posts.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                          <div className="flex items-start">
                            <span className="text-2xl mr-3">⚠️</span>
                            <div>
                              <h4 className="font-semibold text-yellow-900 mb-1">
                                Installer Directory Not Available
                              </h4>
                              <p className="text-sm text-yellow-700">
                                The installation path is not recorded. Please reinstall the agent.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Agent Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Client ID</p>
                          <p className="text-sm font-mono text-gray-900">
                            {client.client_id || "N/A"}
                          </p>
                        </div>
                        {client.agent_version && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Agent Version</p>
                            <p className="text-sm text-gray-900">{client.agent_version}</p>
                          </div>
                        )}
                        {client.installed_at && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Installed At</p>
                            <p className="text-sm text-gray-900">
                              {formatDate(client.installed_at)}
                            </p>
                          </div>
                        )}
                        {client.last_seen && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Last Seen</p>
                            <p className="text-sm text-gray-900">
                              {formatLastSeen(client.last_seen)}
                            </p>
                          </div>
                        )}
                        {client.total_jobs !== undefined && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Total Jobs</p>
                            <p className="text-sm text-gray-900">{client.total_jobs}</p>
                          </div>
                        )}
                        {client.browser_path && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Browser Path</p>
                            <p className="text-sm font-mono text-gray-600 truncate" title={client.browser_path}>
                              {client.browser_path}
                            </p>
                          </div>
                        )}
                      </div>
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
