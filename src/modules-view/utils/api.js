// API client wrapper for frontend calls to Next.js API routes.
// Keep all `fetch` details here so page components stay focused on UI.

// Get auth token from localStorage or sessionStorage
function getAuthToken() {
  if (typeof window === 'undefined') return null;
  // Try localStorage first (persistent)
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  return token;
}

async function requestJson(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    headers,
    ...options,
  });

  let data;
  try {
    data = await res.json();
  } catch (e) {
    // In case the response is not JSON, fall back to a generic message.
    data = { error: 'Unexpected server response' };
  }

  if (!res.ok) {
    const message = data?.error || data?.message || 'Request failed';
    throw new Error(message);
  }

  return data;
}

// Generic helpers that can be reused for non-auth endpoints.
export function getJson(path) {
  return requestJson(path, { method: 'GET' });
}

export function postJson(path, body, method = 'POST') {
  return requestJson(path, {
    method,
    body: JSON.stringify(body),
  });
}

export function deleteJson(path) {
  return requestJson(path, {
    method: 'DELETE',
  });
}

// Auth-specific helpers
export async function loginWithEmailPassword({ email, password }) {
  const data = await postJson('/api/auth/login', { email, password });

  // Store access token for authenticated API calls
  if (typeof window !== 'undefined') {
    const token = data?.session?.access_token;
    if (token) {
      try {
        localStorage.setItem('auth_token', token);
      } catch {
        // Fallback to sessionStorage if localStorage is unavailable
        try {
          sessionStorage.setItem('auth_token', token);
        } catch {
          // Ignore storage errors
        }
      }
    }
  }

  return data;
}

export async function registerWithEmailPassword({ email, password }) {
  return postJson('/api/auth/register', { email, password });
}

// Example non-auth helpers (extend as needed)
export function fetchAccounts() {
  return getJson('/api/accounts/list');
}

export function fetchClients() {
  return getJson('/api/clients/list');
}

/**
 * Logout user
 */
export async function logout() {
  return postJson('/api/auth/logout', {});
}

