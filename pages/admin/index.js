import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getJson } from '@utils/api';
import DashboardNavbar from '@components/DashboardNavbar';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchDashboard() {
      try {
        setLoading(true);
        setError(null);
        const data = await getJson('/api/admin/dashboard');
        if (isMounted) {
          setDashboard(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load admin dashboard');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const StatCard = ({ title, value, subtitle, icon, color = 'blue' }) => {
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      pink: 'bg-pink-500',
    };

    return (
      <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          </div>
          {icon && (
            <div className={`${colorClasses[color]} rounded-full p-3 text-white`}>
              {icon}
            </div>
          )}
        </div>
      </div>
    );
  };

  const NavigationCard = ({ title, description, href, icon, color = 'blue' }) => {
    const colorClasses = {
      blue: 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700',
      green: 'bg-green-50 hover:bg-green-100 border-green-200 text-green-700',
      purple: 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700',
      orange: 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700',
    };

    return (
      <Link href={href}>
        <div
          className={`${colorClasses[color]} rounded-lg border-2 p-6 cursor-pointer transition-all hover:shadow-md`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-sm opacity-80">{description}</p>
            </div>
            {icon && <div className="ml-4 text-2xl">{icon}</div>}
          </div>
          <div className="flex items-center text-sm font-medium mt-4">
            Manage →
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />
      <div className="pt-16 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage micro-actions, workflows, and automation settings
              </p>
            </div>
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
        {!loading && !error && dashboard && (
          <>
            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Micro-Actions"
                value={dashboard.statistics.microActions.total}
                subtitle={`${dashboard.statistics.microActions.recent} created in last 7 days`}
                icon="⚡"
                color="blue"
              />
              <StatCard
                title="Total Workflows"
                value={dashboard.statistics.workflows.total}
                subtitle={`${dashboard.statistics.workflows.recent} created in last 7 days`}
                icon="🔄"
                color="green"
              />
              <StatCard
                title="Platforms"
                value={Object.keys(dashboard.statistics.microActions.byPlatform).length}
                subtitle="Active platforms"
                icon="🌐"
                color="purple"
              />
              <StatCard
                title="Action Types"
                value={Object.keys(dashboard.statistics.microActions.byType).length}
                subtitle="Different action types"
                icon="📋"
                color="orange"
              />
            </div>

            {/* Platform Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Micro-Actions by Platform
                </h2>
                <div className="space-y-2">
                  {Object.entries(dashboard.statistics.microActions.byPlatform).map(
                    ([platform, count]) => (
                      <div key={platform} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 capitalize">{platform}</span>
                        <span className="text-sm font-semibold text-gray-900">{count}</span>
                      </div>
                    ),
                  )}
                  {Object.keys(dashboard.statistics.microActions.byPlatform).length === 0 && (
                    <p className="text-sm text-gray-500">No micro-actions yet</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Workflows by Platform
                </h2>
                <div className="space-y-2">
                  {Object.entries(dashboard.statistics.workflows.byPlatform).map(
                    ([platform, count]) => (
                      <div key={platform} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 capitalize">{platform}</span>
                        <span className="text-sm font-semibold text-gray-900">{count}</span>
                      </div>
                    ),
                  )}
                  {Object.keys(dashboard.statistics.workflows.byPlatform).length === 0 && (
                    <p className="text-sm text-gray-500">No workflows yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Cards */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <NavigationCard
                  title="Micro-Actions"
                  description="Create and manage reusable browser automation actions"
                  href="/admin/micro-actions"
                  icon="⚡"
                  color="blue"
                />
                <NavigationCard
                  title="Workflows"
                  description="Build automation workflows by combining micro-actions"
                  href="/admin/workflows"
                  icon="🔄"
                  color="green"
                />
                <NavigationCard
                  title="Users"
                  description="Manage platform users, tiers, and permissions"
                  href="/admin/users"
                  icon="👥"
                  color="purple"
                />
              </div>
            </div>

            {/* Type Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Micro-Actions by Type
                </h2>
                <div className="space-y-2">
                  {Object.entries(dashboard.statistics.microActions.byType).map(
                    ([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 capitalize">{type}</span>
                        <span className="text-sm font-semibold text-gray-900">{count}</span>
                      </div>
                    ),
                  )}
                  {Object.keys(dashboard.statistics.microActions.byType).length === 0 && (
                    <p className="text-sm text-gray-500">No micro-actions yet</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Workflows by Type
                </h2>
                <div className="space-y-2">
                  {Object.entries(dashboard.statistics.workflows.byType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 capitalize">{type}</span>
                      <span className="text-sm font-semibold text-gray-900">{count}</span>
                    </div>
                  ))}
                  {Object.keys(dashboard.statistics.workflows.byType).length === 0 && (
                    <p className="text-sm text-gray-500">No workflows yet</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}