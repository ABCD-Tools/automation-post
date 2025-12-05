import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'react-toastify';
import { getJson, postJson } from '@modules-view/utils/api';

const DashboardNavbar = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();

  // Fetch user profile
  useEffect(() => {
    async function fetchUser() {
      try {
        const userData = await getJson('/api/auth/me');
        setUser(userData);
      } catch (err) {
        console.error('Failed to fetch user:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleLogout = async () => {
    try {
      await postJson('/api/auth/logout', {});
      
      // Clear tokens from storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_token');
      }

      toast.success('Logged out successfully');
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
      // Still clear tokens and redirect even if API call fails
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_token');
      }
      toast.error('Logout failed, but session cleared');
      router.push('/login');
    }
  };

  const handleProfile = () => {
    router.push('/settings/profile');
    setDropdownOpen(false);
  };

  // Get user initials for avatar
  const getInitials = (email) => {
    if (!email) return 'U';
    const parts = email.split('@')[0];
    if (parts.length >= 2) {
      return parts.substring(0, 2).toUpperCase();
    }
    return parts.charAt(0).toUpperCase();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark border-b border-dark/50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex-shrink-0">
            <Link href="/dashboard" className="flex items-center">
              <Image src="/icon0.svg" alt="ABCD Tools" width={32} height={32} />
              <span className="ml-2 text-xl font-semibold text-light">AutoPost</span>
            </Link>
          </div>

          {/* User Avatar with Dropdown */}
          <div className="relative" ref={dropdownRef}>
            {loading ? (
              <div className="w-10 h-10 rounded-full bg-light/20 animate-pulse" />
            ) : (
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-light/50 rounded-full p-1"
                aria-label="User menu"
              >
                <div className="w-10 h-10 rounded-full bg-light text-dark flex items-center justify-center font-semibold text-sm border-2 border-light/50 hover:border-light transition-colors">
                  {user?.email ? getInitials(user.email) : 'U'}
                </div>
              </button>
            )}

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-dark border border-light/20 rounded-lg shadow-lg py-1 z-50">
                {/* User Info */}
                {user && (
                  <div className="px-4 py-2 border-b border-light/10">
                    <p className="text-sm font-medium text-light truncate">{user.email}</p>
                    {user.tier && (
                      <p className="text-xs text-light/60 capitalize">{user.tier}</p>
                    )}
                  </div>
                )}

                {/* Profile Button */}
                <button
                  onClick={handleProfile}
                  className="w-full text-left px-4 py-2 text-sm text-light hover:bg-light/10 transition-colors flex items-center space-x-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <span>Profile</span>
                </button>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-light hover:bg-light/10 transition-colors flex items-center space-x-2 border-t border-light/10"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default DashboardNavbar;

