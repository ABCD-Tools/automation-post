// API client wrapper for frontend calls to Next.js API routes.
// Keep all `fetch` details here so page components stay focused on UI.

async function requestJson(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
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

export function postJson(path, body) {
  return requestJson(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// Auth-specific helpers
export async function loginWithEmailPassword({ email, password }) {
  return postJson('/api/auth/login', { email, password });
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

