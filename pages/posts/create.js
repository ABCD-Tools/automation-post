import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Sidebar from "@pages/dashboard/sidebar";
import DashboardNavbar from "@components/DashboardNavbar";
import { postJson, getJson } from "@utils/api";
import { toast } from "react-toastify";

export default function CreatePost() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [targetAccounts, setTargetAccounts] = useState([]);
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [scheduledFor, setScheduledFor] = useState("");

  // Load accounts on mount
  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await getJson("/api/accounts/list");
      const accounts = response.accounts || [];
      // MVP: Show all available accounts (no verification check needed)
      // Previously: accounts.filter((acc) => acc.status === "active")
      // Just filter out pending_verification and locked accounts
      setAvailableAccounts(
        accounts.filter(
          (acc) =>
            acc.status !== "pending_verification" &&
            !acc.locked_until
        )
      );
    } catch (err) {
      console.error("Failed to load accounts:", err);
      toast.error("Failed to load accounts");
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Only JPG, PNG, and WEBP are allowed.");
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target.result);
    };
    reader.readAsDataURL(file);

    // Upload image
    uploadImage(file);
  };

  const uploadImage = async (file) => {
    try {
      setUploading(true);

      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64Data = event.target.result;
          const response = await postJson("/api/posts/upload", {
            image: base64Data,
          });

          setImageUrl(response.url);
          toast.success("Image uploaded successfully");
        } catch (err) {
          toast.error(err.message || "Failed to upload image");
        } finally {
          setUploading(false);
        }
      };
      reader.onerror = () => {
        toast.error("Failed to read image file");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error(err.message || "Failed to upload image");
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!caption.trim()) {
      toast.error("Caption is required");
      return;
    }

    if (!imageUrl) {
      toast.error("Please upload an image first");
      return;
    }

    if (caption.length > 2200) {
      toast.error("Caption must be 2200 characters or less");
      return;
    }

    try {
      setLoading(true);

      const postData = {
        caption: caption.trim(),
        image_url: imageUrl,
      };

      // Add target accounts if selected
      if (targetAccounts.length > 0) {
        postData.target_accounts = targetAccounts;
      }

      // Add scheduled time if provided
      if (scheduledFor) {
        postData.scheduled_for = new Date(scheduledFor).toISOString();
      }

      const response = await postJson("/api/posts/create", postData);

      toast.success("Post created successfully!");
      router.push(`/posts/${response.job.id}`);
    } catch (err) {
      toast.error(err.message || "Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  const handleAccountToggle = (accountId) => {
    setTargetAccounts((prev) => {
      if (prev.includes(accountId)) {
        return prev.filter((id) => id !== accountId);
      } else {
        return [...prev, accountId];
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-56 p-6">
          {/* Header */}
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Create Post</h1>
            <p className="text-sm text-gray-600 mt-1">
              Upload an image and write a caption to create a new post
            </p>
          </header>

          <form onSubmit={handleSubmit} className="max-w-3xl">
            <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image *
                </label>
                {!imagePreview && !imageUrl ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleImageSelect}
                      disabled={uploading}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <svg
                        className="w-12 h-12 text-gray-400 mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="text-gray-600">
                        {uploading ? "Uploading..." : "Click to upload image"}
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        JPG, PNG, WEBP (max 10MB)
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={imagePreview || imageUrl}
                      alt="Preview"
                      className="max-w-full max-h-96 rounded-lg object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview("");
                        setImageUrl("");
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Caption */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Caption * ({caption.length}/2200)
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={6}
                  maxLength={2200}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Write your post caption here..."
                />
              </div>

              {/* Target Accounts */}
              {availableAccounts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Accounts (leave empty to post to all available accounts)
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-4">
                    {availableAccounts.map((account) => (
                      <label
                        key={account.id}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={targetAccounts.includes(account.id)}
                          onChange={() => handleAccountToggle(account.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 capitalize">
                          {account.platform} - {account.username}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Scheduled Time (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schedule Post (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to post immediately
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || uploading || !caption.trim() || !imageUrl}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating..." : "Create Post"}
                </button>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
