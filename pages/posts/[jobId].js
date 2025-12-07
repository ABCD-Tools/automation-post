import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Sidebar from "@pages/dashboard/sidebar";
import DashboardNavbar from "@components/DashboardNavbar";
import { getJson } from "@utils/api";
import { toast } from "react-toastify";

export default function JobDetail() {
  const router = useRouter();
  const { jobId } = router.query;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [job, setJob] = useState(null);
  const [executionReports, setExecutionReports] = useState([]);

  useEffect(() => {
    if (jobId) {
      fetchJobDetails();
      fetchExecutionReports();
    }
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getJson(`/api/posts/${jobId}`);
      setJob(response);
    } catch (err) {
      setError(err.message || "Failed to load job details");
      toast.error(err.message || "Failed to load job details");
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutionReports = async () => {
    try {
      const response = await getJson(`/api/execution-reports/list?jobId=${jobId}`);
      setExecutionReports(response.reports || []);
    } catch (err) {
      console.error("Failed to load execution reports:", err);
      // Don't show error toast for execution reports, they might not exist
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "queued":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatDuration = (ms) => {
    if (!ms) return "N/A";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
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
              <p className="mt-2 text-gray-600">Loading job details...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNavbar />
        <div className="flex pt-16">
          <Sidebar />
          <main className="flex-1 ml-0 md:ml-56 p-6">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error || "Job not found"}
            </div>
            <button
              onClick={() => router.push("/posts")}
              className="text-blue-600 hover:text-blue-700"
            >
              ← Back to Posts
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
            <div>
              <button
                onClick={() => router.push("/posts")}
                className="text-blue-600 hover:text-blue-700 mb-2 flex items-center"
              >
                ← Back to Posts
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Job Details</h1>
              <p className="text-sm text-gray-600 mt-1">Job ID: {job.id}</p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                job.status
              )}`}
            >
              {job.status || "Unknown"}
            </span>
          </header>

          <div className="space-y-6">
            {/* Job Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Job Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium">{job.status || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Job Type</p>
                  <p className="font-medium capitalize">{job.job_type || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created At</p>
                  <p className="font-medium">{formatDate(job.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Processed At</p>
                  <p className="font-medium">{formatDate(job.processed_at)}</p>
                </div>
                {job.scheduled_for && (
                  <div>
                    <p className="text-sm text-gray-500">Scheduled For</p>
                    <p className="font-medium">{formatDate(job.scheduled_for)}</p>
                  </div>
                )}
                {job.target_accounts && (
                  <div>
                    <p className="text-sm text-gray-500">Target Accounts</p>
                    <p className="font-medium">
                      {job.target_accounts.length} account
                      {job.target_accounts.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Post Content */}
            {job.content && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Post Content</h2>
                {job.content.caption && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-1">Caption</p>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {job.content.caption}
                    </p>
                  </div>
                )}
                {job.content.image_url && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Image</p>
                    <img
                      src={job.content.image_url}
                      alt="Post image"
                      className="max-w-full max-h-96 rounded-lg object-contain"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Execution Reports */}
            {executionReports.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Execution Reports</h2>
                <div className="space-y-4">
                  {executionReports.map((report) => (
                    <div
                      key={report.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {report.workflow_name || "Execution Report"}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {formatDate(report.start_time)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-700">
                            {report.success_rate?.toFixed(1) || 0}% Success
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDuration(report.duration)}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Total Actions</p>
                          <p className="font-medium">{report.total_actions || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Successful</p>
                          <p className="font-medium text-green-600">
                            {report.successful_actions || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Failed</p>
                          <p className="font-medium text-red-600">
                            {report.failed_actions || 0}
                          </p>
                        </div>
                      </div>
                      {report.error_count > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm text-red-600">
                            {report.error_count} error
                            {report.error_count !== 1 ? "s" : ""} occurred
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {job.results && Array.isArray(job.results) && job.results.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Results</h2>
                <div className="space-y-2">
                  {job.results.map((result, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded ${
                        result.success
                          ? "bg-green-50 border border-green-200"
                          : "bg-red-50 border border-red-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {result.account_id?.substring(0, 8) || `Account ${idx + 1}`}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            result.success
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {result.success ? "Success" : "Failed"}
                        </span>
                      </div>
                      {result.error && (
                        <p className="text-xs text-red-600 mt-1">{result.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
