import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Sidebar from "./dashboard/sidebar";
import DashboardNavbar from "@components/DashboardNavbar";
import { getJson } from "@utils/api";

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch dashboard stats and user info in parallel
        const [statsResponse, userResponse] = await Promise.all([
          getJson("/api/execution-reports/dashboard").catch(() => ({
            success: false,
            data: null,
          })),
          getJson("/api/auth/me").catch(() => null),
        ]);

        if (isMounted) {
          if (statsResponse.success) {
            setDashboardStats(statsResponse.data);
          }
          if (userResponse) {
            setUser(userResponse);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load dashboard");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  const StatCard = ({ title, value, subtitle, icon, color = "blue" }) => {
    const colorClasses = {
      blue: "bg-blue-500",
      green: "bg-green-500",
      purple: "bg-purple-500",
      orange: "bg-orange-500",
      red: "bg-red-500",
    };

    return (
      <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          {icon && (
            <div
              className={`${colorClasses[color]} rounded-full p-3 text-white text-xl`}
            >
              {icon}
            </div>
          )}
        </div>
      </div>
    );
  };

  const QuickLinkCard = ({ title, description, href, icon }) => {
    return (
      <button
        onClick={() => router.push(href)}
        className="bg-white rounded-lg border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 p-6 cursor-pointer transition-all hover:shadow-md text-left"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">
              {title}
            </h3>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
          {icon && <div className="ml-4 text-2xl">{icon}</div>}
        </div>
        <div className="flex items-center text-sm font-medium text-blue-600 mt-4">
          Go to {title} →
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-56 p-6">
          {/* Header */}
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">
              Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
              {user?.tier && ` (${user.tier} tier)`}
            </p>
          </header>

          {/* Loading State */}
          {loading && (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <p className="mt-2 text-gray-600">Loading dashboard...</p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Dashboard Content */}
          {!loading && !error && (
            <>
              {/* Statistics */}
              {dashboardStats ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                      title="Total Executions"
                      value={dashboardStats.totalExecutions || 0}
                      subtitle="Workflow runs"
                      icon="⚡"
                      color="blue"
                    />
                    <StatCard
                      title="Total Actions"
                      value={dashboardStats.totalActions || 0}
                      subtitle="Actions executed"
                      icon="🔄"
                      color="green"
                    />
                    <StatCard
                      title="Success Rate"
                      value={`${dashboardStats.avgSuccessRate || 0}%`}
                      subtitle={`${dashboardStats.successfulExecutions || 0} successful`}
                      icon="✅"
                      color="purple"
                    />
                    <StatCard
                      title="Total Errors"
                      value={dashboardStats.totalErrors || 0}
                      subtitle="Errors encountered"
                      icon="⚠️"
                      color={dashboardStats.totalErrors > 0 ? "red" : "orange"}
                    />
                  </div>

                  {/* Method Usage */}
                  {dashboardStats.methodUsage &&
                    Object.values(dashboardStats.methodUsage).some(
                      (v) => v > 0
                    ) && (
                      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                          Method Usage
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {Object.entries(dashboardStats.methodUsage).map(
                            ([method, count]) => (
                              <div
                                key={method}
                                className="text-center p-4 bg-gray-50 rounded-lg"
                              >
                                <p className="text-2xl font-bold text-gray-900">
                                  {count}
                                </p>
                                <p className="text-sm text-gray-600 capitalize mt-1">
                                  {method}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </>
              ) : (
                <div className="bg-white rounded-lg shadow-md p-8 mb-8 text-center">
                  <p className="text-gray-600">
                    No execution data yet. Start by creating posts or running
                    workflows!
                  </p>
                </div>
              )}

              {/* Quick Links */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Quick Actions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <QuickLinkCard
                    title="Posts"
                    description="Create and manage your social media posts"
                    href="/posts"
                    icon="📝"
                  />
                  <QuickLinkCard
                    title="Accounts"
                    description="Manage your social media accounts"
                    href="/accounts"
                    icon="👤"
                  />
                  <QuickLinkCard
                    title="Clients"
                    description="View and manage your clients"
                    href="/clients"
                    icon="🏢"
                  />
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
