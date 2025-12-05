import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { requestPasswordReset } from '../src/modules-view/utils/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      await requestPasswordReset({ email });
      setSuccess(true);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (err) {
      toast.error(err.message || 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-screen bg-dark text-light flex items-center justify-center">
      <main className="glass rounded-xl border border-dark/50 space-y-5 p-5 w-1/3">
        <h1 className="text-2xl">Forgot Password</h1>
        
        {success ? (
          <div className="space-y-4">
            <div className="bg-green-500/20 border border-green-500 rounded p-4 text-green-300">
              <p className="font-semibold mb-2">Email Sent!</p>
              <p className="text-sm">
                If an account with that email exists, a password reset link has been sent.
                Please check your email and click the link to reset your password.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Link
                href="/login"
                className="text-center bg-dark text-light font-semibold rounded p-3 hover:bg-dark/80 transition-colors"
              >
                Back to Login
              </Link>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-3"
            style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
          >
            <p className="text-sm text-gray-300 mb-4">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            
            <label className="w-full flex items-start justify-between">
              Email
              <input
                className="rounded outline-none px-2 py-1 bg-transparent border border-light"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
              />
            </label>
            
            <button
              type="submit"
              disabled={loading}
              className="bg-dark text-light font-semibold rounded p-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            
            <div className="w-full flex items-center justify-center px-3">
              <p className="text-xs flex items-center justify-start gap-2">
                Remember your password?{' '}
                <Link
                  href="/login"
                  className="text-blue-500 hover:text-blue-700 underline"
                >
                  Login
                </Link>
              </p>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

