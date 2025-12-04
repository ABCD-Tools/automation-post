import { useEffect, useState } from 'react';
import { getJson } from '@utils/api';

export default function SuperadminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchSummary() {
      try {
        setLoading(true);
        setError(null);
        const data = await getJson('/api/admin/super-dashboard');
        if (isMounted) {
          setSummary(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load superadmin dashboard');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchSummary();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Superadmin Dashboard</h1>
          {summary?.user && (
            <div className="text-sm text-gray-600">
              Logged in as <span className="font-semibold">{summary.user.email}</span>{' '}
              <span className="ml-2 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-medium">
                {summary.user.tier}
              </span>
            </div>
          )}
        </header>

        {loading && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
            <p className="mt-2 text-gray-600">Loading superadmin data...</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {!loading && !error && summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Overview</h2>
              <p className="text-gray-700 text-sm">
                This is a minimal superadmin dashboard. You can extend it with user statistics,
                system health, and other global controls.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


