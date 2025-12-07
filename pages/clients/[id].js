import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Sidebar from "../dashboard/sidebar";
import DashboardNavbar from "@components/DashboardNavbar";
import { getJson } from "@utils/api";
import { toast } from "react-toastify";

export default function ClientDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [client, setClient] = useState(null);

  useEffect(() => {
    if (id) {
      fetchClient();
    }
  }, [id]);

  const fetchClient = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getJson(`/api/clients/${id}`);
      setClient(response);
    } catch (err) {
      setError(err.message || "Failed to load client");
      toast.error(err.message || "Failed to load client");
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

  const formatDate = (date) => {
    if (!date) return "Never";
    return new Date(date).toLocaleString();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNavbar />
        <div className="flex pt-16">
          <Sidebar />
          <main className="flex-1 ml-0 md:ml-56 p-6">
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <p className="mt-2 text-gray-600">Loading client details...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNavbar />
        <div className="flex pt-16">
          <Sidebar />
          <main className="flex-1 ml-0 md:ml-56 p-6">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error || "Client not found"}
            </div>
            <button
              onClick={() => router.push("/clients")}
              className="text-blue-600 hover:text-blue-700"
            >
              ← Back to Clients
            </button>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-56 p-6">
          {/* Header */}
          <header className="mb-8 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/clients")}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {client.client_name || client.client_id || "Unnamed Client"}
                </h1>
                <p className="text-sm text-gray-600 mt-1">Agent Details</p>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(
                client.status
              )}`}
            >
              {client.status || "Unknown"}
            </span>
          </header>

          {/* Client Info Card */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Agent Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Client ID
                  </label>
                  <p className="text-gray-900 mt-1">{client.client_id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Client Name
                  </label>
                  <p className="text-gray-900 mt-1">
                    {client.client_name || "Not set"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Platform
                  </label>
                  <p className="text-gray-900 mt-1 flex items-center space-x-2">
                    <span className="text-2xl">
                      {getPlatformIcon(client.platform)}
                    </span>
                    <span className="capitalize">
                      {client.platform || "Unknown"}
                      {client.os_version && ` • ${client.os_version}`}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Agent Version
                  </label>
                  <p className="text-gray-900 mt-1">
                    {client.agent_version || "Unknown"}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Status
                  </label>
                  <p className="text-gray-900 mt-1 capitalize">
                    {client.status || "Unknown"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Last Seen
                  </label>
                  <p className="text-gray-900 mt-1">
                    {formatLastSeen(client.last_seen)}
                  </p>
                  {client.last_seen && (
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(client.last_seen)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Last Heartbeat
                  </label>
                  <p className="text-gray-900 mt-1">
                    {formatLastSeen(client.last_heartbeat)}
                  </p>
                  {client.last_heartbeat && (
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(client.last_heartbeat)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Total Jobs
                  </label>
                  <p className="text-gray-900 mt-1">
                    {client.total_jobs !== undefined ? client.total_jobs : 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Installation Details */}
          {client.install_path && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Installation Details
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Installation Path
                  </label>
                  <p className="text-gray-900 mt-1 font-mono text-sm break-all">
                    📁 {client.install_path}
                  </p>
                </div>
                {client.installed_at && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Installed At
                    </label>
                    <p className="text-gray-900 mt-1">
                      {formatDate(client.installed_at)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              System Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Platform
                </label>
                <p className="text-gray-900 mt-1 capitalize">
                  {client.platform || "Unknown"}
                </p>
              </div>
              {client.os_version && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    OS Version
                  </label>
                  <p className="text-gray-900 mt-1">{client.os_version}</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

