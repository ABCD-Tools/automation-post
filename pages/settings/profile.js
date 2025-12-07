import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Sidebar from "../dashboard/sidebar";
import DashboardNavbar from "@components/DashboardNavbar";
import { getJson, postJson } from "@utils/api";
import { toast } from "react-toastify";

export default function Profile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState({
    email: "",
    tier: "free",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getJson("/api/user/profile");
      setProfile({
        email: response.email || "",
        tier: response.tier || "free",
      });
    } catch (err) {
      setError(err.message || "Failed to load profile");
      toast.error(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);

      const response = await postJson("/api/user/profile", profile, "PUT");

      toast.success("Profile updated successfully!");
      setProfile(response.profile);
    } catch (err) {
      setError(err.message || "Failed to update profile");
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
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
              <p className="mt-2 text-gray-600">Loading profile...</p>
            </div>
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
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage your account information
            </p>
          </header>

          <form onSubmit={handleSubmit} className="max-w-2xl">
            <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={profile.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your@email.com"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">
                  Email cannot be changed here. Use password reset to change email.
                </p>
              </div>

              {/* Tier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Tier
                </label>
                <select
                  name="tier"
                  value={profile.tier}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled
                >
                  <option value="free">Free</option>
                  <option value="premium">Premium</option>
                  <option value="enterprise">Enterprise</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Tier changes require admin approval.
                </p>
              </div>

              {/* Account Information */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Account Information
                </h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>
                    <span className="font-medium">User ID:</span> {profile.id || "N/A"}
                  </p>
                  {profile.created_at && (
                    <p>
                      <span className="font-medium">Member since:</span>{" "}
                      {new Date(profile.created_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </form>

          {/* Additional Actions */}
          <div className="mt-6 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Account Actions
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => router.push("/settings/agents")}
                className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-900">Manage Agents</div>
                <div className="text-sm text-gray-500">
                  View and manage your installed client agents
                </div>
              </button>
              <button
                onClick={() => router.push("/accounts")}
                className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-900">Manage Accounts</div>
                <div className="text-sm text-gray-500">
                  Add and manage your social media accounts
                </div>
              </button>
              <button
                onClick={() => router.push("/forgot-password")}
                className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-900">Change Password</div>
                <div className="text-sm text-gray-500">
                  Update your account password
                </div>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
