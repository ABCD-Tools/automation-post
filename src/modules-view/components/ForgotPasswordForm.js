// Forgot Password Form Component
// Reusable component for forgot password functionality

import { useState } from 'react';
import { requestPasswordReset } from '../utils/api';

export default function ForgotPasswordForm({ onSuccess, onCancel }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await requestPasswordReset({ email });
      if (onSuccess) {
        onSuccess(email);
      }
    } catch (err) {
      setError(err.message || 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-500/20 border border-red-500 rounded p-3 text-red-300 text-sm">
          {error}
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium mb-2">
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="your@email.com"
          className="w-full rounded outline-none px-3 py-2 bg-transparent border border-light"
        />
      </div>
      
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-dark text-light font-semibold rounded p-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 text-light font-semibold rounded hover:bg-gray-700"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

