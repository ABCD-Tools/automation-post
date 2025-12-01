// Supabase handles email verification via magic link. This endpoint can be
// extended later if you want a custom verification flow. For now it just
// confirms the request is reachable.

export default async function handler(req, res) {
  return res.status(200).json({ message: 'Verification handled by Supabase' });
}
