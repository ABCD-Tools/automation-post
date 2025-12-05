import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { getSupabaseBrowserClient } from '../src/modules-view/utils/supabase';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Supabase automatically handles hash fragments (#access_token=...&type=recovery) when the page loads
    // We need to check if there's a valid session from the recovery token
    async function checkSession() {
      // Only run on client side
      if (typeof window === 'undefined') {
        return;
      }

      try {
        // Try to get Supabase client - it will throw if env vars are missing
        let supabase;
        try {
          supabase = getSupabaseBrowserClient();
        } catch (envError) {
          setError('Supabase configuration is missing. Please create a .env.local file with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. Restart the dev server after creating the file.');
          setCheckingSession(false);
          console.error('Supabase env error:', envError.message);
          return;
        }
        
        // Check URL hash for recovery token
        const hash = typeof window !== 'undefined' ? window.location.hash : '';
        const hashParams = new URLSearchParams(hash.substring(1)); // Remove #
        const type = hashParams.get('type');
        
        if (!hash || type !== 'recovery') {
          setError('Invalid or missing reset token. Please request a new password reset.');
          setCheckingSession(false);
          return;
        }

        // Supabase automatically processes the hash and creates a session
        // Wait a moment for Supabase to process the hash, then check for session
        setTimeout(async () => {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('Session error:', sessionError);
            setError('Invalid or expired reset token. Please request a new password reset.');
            setCheckingSession(false);
            return;
          }

          if (session) {
            setHasValidSession(true);
          } else {
            // Try one more time after a short delay
            setTimeout(async () => {
              const { data: { session: retrySession } } = await supabase.auth.getSession();
              if (retrySession) {
                setHasValidSession(true);
              } else {
                setError('Invalid or expired reset token. Please request a new password reset.');
              }
              setCheckingSession(false);
            }, 500);
            return;
          }
          
          setCheckingSession(false);
        }, 100);
      } catch (err) {
        console.error('Error checking session:', err);
        setError('Failed to verify reset token. Please request a new password reset.');
        setCheckingSession(false);
      }
    }

    // Only check on client side
    if (typeof window !== 'undefined') {
      checkSession();
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate passwords
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      
      // Verify we still have a valid session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Session expired. Please request a new password reset.');
      }
      
      // Update password using Supabase
      // Supabase will use the recovery session to update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw new Error(updateError.message || 'Failed to reset password');
      }

      // Sign out after password reset (security best practice)
      await supabase.auth.signOut();

      setSuccess(true);
      toast.success('Password reset successfully! Redirecting to login...');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to reset password');
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking session
  if (checkingSession) {
    return (
      <div className="w-full h-screen bg-dark text-light flex items-center justify-center">
        <main className="glass rounded-xl border border-dark/50 space-y-5 p-5 w-1/3">
          <h1 className="text-2xl">Reset Password</h1>
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-light mb-4" />
            <p className="text-sm text-gray-300">Verifying reset token...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error && !hasValidSession) {
    return (
      <div className="w-full h-screen bg-dark text-light flex items-center justify-center">
        <main className="glass rounded-xl border border-dark/50 space-y-5 p-5 w-1/3">
          <h1 className="text-2xl">Reset Password</h1>
          <div className="bg-red-500/20 border border-red-500 rounded p-4 text-red-300">
            <p className="font-semibold mb-2">Error</p>
            <p className="text-sm">{error}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Link
              href="/forgot-password"
              className="text-center bg-dark text-light font-semibold rounded p-3 hover:bg-dark/80 transition-colors"
            >
              Request New Reset Link
            </Link>
            <Link
              href="/login"
              className="text-center text-blue-500 hover:text-blue-700 underline text-sm"
            >
              Back to Login
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full h-screen bg-dark text-light flex items-center justify-center">
        <main className="glass rounded-xl border border-dark/50 space-y-5 p-5 w-1/3">
          <h1 className="text-2xl">Password Reset Successful</h1>
          <div className="bg-green-500/20 border border-green-500 rounded p-4 text-green-300">
            <p className="font-semibold mb-2">Success!</p>
            <p className="text-sm">
              Your password has been reset successfully. Redirecting to login...
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-dark text-light flex items-center justify-center">
      <main className="glass rounded-xl border border-dark/50 space-y-5 p-5 w-1/3">
        <h1 className="text-2xl">Reset Password</h1>
        
        <form
          onSubmit={handleSubmit}
          className="space-y-3"
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        >
          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded p-3 text-red-300 text-sm">
              {error}
            </div>
          )}
          
          <label className="w-full flex items-start justify-between">
            New Password
            <input
              className="rounded outline-none px-2 py-1 bg-transparent border border-light"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="At least 8 characters"
            />
          </label>
          
          <label className="w-full flex items-start justify-between">
            Confirm Password
            <input
              className="rounded outline-none px-2 py-1 bg-transparent border border-light"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Confirm your password"
            />
          </label>
          
          <button
            type="submit"
            disabled={loading}
            className="bg-dark text-light font-semibold rounded p-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>
          
          <div className="w-full flex items-center justify-center px-3">
            <Link
              href="/login"
              className="text-xs text-blue-500 hover:text-blue-700 underline"
            >
              Back to Login
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}

