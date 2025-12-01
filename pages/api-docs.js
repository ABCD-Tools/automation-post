const endpoints = [
  {
    title: 'Register',
    method: 'POST',
    path: '/api/auth/register',
    description: 'Register a new user and trigger Supabase email verification.',
    body: [
      { field: 'email', type: 'string', notes: 'Required, must be a valid email' },
      { field: 'password', type: 'string', notes: 'Required, minimum 8 characters' },
    ],
    responses: [
      { code: 200, meaning: 'Registration successful' },
      { code: 400, meaning: 'Validation error or Supabase rejected the request' },
    ],
  },
  {
    title: 'Login',
    method: 'POST',
    path: '/api/auth/login',
    description: 'Obtain a Supabase session for an already verified user.',
    body: [
      { field: 'email', type: 'string', notes: 'Required, must be a valid email' },
      { field: 'password', type: 'string', notes: 'Required' },
    ],
    responses: [
      { code: 200, meaning: 'Login successful, session + user returned' },
      { code: 400, meaning: 'Invalid credentials or Supabase error' },
    ],
  },
];

export default function ApiDocsPage() {
  return (
    <main style={{ maxWidth: 720, margin: '2rem auto', padding: '1rem' }}>
      <h1>API Reference</h1>
      <p style={{ color: '#555' }}>
        Current MVP endpoints for authentication. Send JSON payloads and expect JSON responses.
      </p>

      {endpoints.map((endpoint) => (
        <section
          key={endpoint.path}
          style={{
            border: '1px solid #e5e5e5',
            borderRadius: 8,
            padding: '1rem',
            marginTop: '1.5rem',
          }}
        >
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{endpoint.title}</strong>
              <div style={{ color: '#666' }}>{endpoint.description}</div>
            </div>
            <code style={{ background: '#f3f4f6', padding: '0.25rem 0.5rem', borderRadius: 4 }}>
              {endpoint.method} {endpoint.path}
            </code>
          </header>

          <div style={{ marginTop: '0.75rem' }}>
            <strong>Request Body</strong>
            <ul>
              {endpoint.body.map((field) => (
                <li key={field.field}>
                  <code>{field.field}</code> ({field.type}) – {field.notes}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ marginTop: '0.75rem' }}>
            <strong>Responses</strong>
            <ul>
              {endpoint.responses.map((response) => (
                <li key={response.code}>
                  <code>{response.code}</code> – {response.meaning}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}
    </main>
  );
}
