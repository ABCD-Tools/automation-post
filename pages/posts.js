import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Sidebar from "./dashboard/sidebar";
import DashboardNavbar from "@components/DashboardNavbar";
import { getJson } from "@utils/api";
import { toast } from "react-toastify";

export default function Posts() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [posts, setPosts] = useState([]);
  const [filters, setFilters] = useState({ status: "" });
  const [pagination, setPagination] = useState({
    total: 0,
    count: 0,
    limit: 50,
    offset: 0,
  });

  useEffect(() => {
    fetchPosts();
  }, [filters]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      params.append("limit", pagination.limit.toString());
      params.append("offset", pagination.offset.toString());

      const queryString = params.toString();
      const response = await getJson(`/api/posts/list?${queryString}`);
      setPosts(response.posts || []);
      setPagination({
        total: response.total || 0,
        count: response.count || 0,
        limit: response.limit || 50,
        offset: response.offset || 0,
      });
    } catch (err) {
      setError(err.message || "Failed to load posts");
      toast.error(err.message || "Failed to load posts");
    } finally {
      setLoading(false);
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

  const truncateText = (text, maxLength = 100) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
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
              <h1 className="text-3xl font-bold text-gray-900">Posts</h1>
              <p className="text-sm text-gray-600 mt-1">
                View and manage your post history
              </p>
            </div>
            <button
              onClick={() => router.push("/posts/create")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <span>+</span>
              <span>Create Post</span>
            </button>
          </header>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex gap-4">
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters({ ...filters, status: e.target.value });
                setPagination({ ...pagination, offset: 0 });
              }}
              className="border border-gray-300 rounded px-3 py-2"
            >
              <option value="">All Statuses</option>
              <option value="queued">Queued</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <div className="flex items-center text-sm text-gray-600">
              Showing {pagination.count} of {pagination.total} posts
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <p className="mt-2 text-gray-600">Loading posts...</p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Posts List */}
          {!loading && !error && (
            <>
              {posts.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <p className="text-gray-600 mb-4">No posts found</p>
                  <button
                    onClick={() => router.push("/posts/create")}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Create your first post
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <div
                        key={post.id}
                        className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => router.push(`/posts/${post.id}`)}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                                  post.status
                                )}`}
                              >
                                {post.status || "Unknown"}
                              </span>
                              <span className="text-sm text-gray-500">
                                {formatDate(post.created_at)}
                              </span>
                            </div>
                            {post.content?.caption && (
                              <p className="text-gray-700 mb-2">
                                {truncateText(post.content.caption)}
                              </p>
                            )}
                            {post.content?.image_url && (
                              <div className="mb-2">
                                <img
                                  src={post.content.image_url}
                                  alt="Post preview"
                                  className="max-w-xs max-h-32 rounded object-cover"
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div>
                            {post.target_accounts && (
                              <span>
                                {post.target_accounts.length} account
                                {post.target_accounts.length !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                          {post.processed_at && (
                            <span>Processed: {formatDate(post.processed_at)}</span>
                          )}
                        </div>

                        {post.results && Array.isArray(post.results) && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-xs text-gray-500 mb-2">Results:</p>
                            <div className="flex flex-wrap gap-2">
                              {post.results.map((result, idx) => (
                                <span
                                  key={idx}
                                  className={`px-2 py-1 rounded text-xs ${
                                    result.success
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {result.account_id?.substring(0, 8) || `Account ${idx + 1}`}:{" "}
                                  {result.success ? "Success" : "Failed"}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {pagination.total > pagination.limit && (
                    <div className="mt-6 flex justify-center items-center space-x-4">
                      <button
                        onClick={() => {
                          const newOffset = Math.max(0, pagination.offset - pagination.limit);
                          setPagination({ ...pagination, offset: newOffset });
                          fetchPosts();
                        }}
                        disabled={pagination.offset === 0}
                        className="px-4 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-600">
                        Page {Math.floor(pagination.offset / pagination.limit) + 1} of{" "}
                        {Math.ceil(pagination.total / pagination.limit)}
                      </span>
                      <button
                        onClick={() => {
                          const newOffset = pagination.offset + pagination.limit;
                          if (newOffset < pagination.total) {
                            setPagination({ ...pagination, offset: newOffset });
                            fetchPosts();
                          }
                        }}
                        disabled={pagination.offset + pagination.limit >= pagination.total}
                        className="px-4 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

