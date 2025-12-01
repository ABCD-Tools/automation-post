import { loginWithEmail } from '@modules-logic/services/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const data = await loginWithEmail(email, password);
    return res.status(200).json({
      message: 'Login successful',
      session: data.session ?? null,
      user: data.user ?? null,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(400).json({ error: err.message || 'Login failed' });
  }
}
