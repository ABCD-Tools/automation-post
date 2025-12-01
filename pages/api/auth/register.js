import { registerWithEmail } from '@modules-logic/services/auth';

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
    const data = await registerWithEmail(email, password);
    return res.status(200).json({
      message: 'Registration successful. Please check your email to verify your account.',
      user: data.user ?? null,
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(400).json({ error: err.message || 'Registration failed' });
  }
}
