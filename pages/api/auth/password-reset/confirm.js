/**
 * @swagger
 * /api/auth/password-reset/confirm:
 *   post:
 *     summary: Confirm password reset (handled by Supabase)
 *     tags: [Authentication]
 *     description: |
 *       Password reset confirmation is handled automatically by Supabase via magic link.
 *       When user clicks the reset link in their email, Supabase redirects them to
 *       the configured redirect URL where they can set a new password.
 *       This endpoint exists for documentation purposes.
 *     responses:
 *       200:
 *         description: Information about password reset flow
 */
export default async function handler(req, res) {
  return res.status(200).json({
    message: 'Password reset confirmation is handled by Supabase via magic link. Check your email for the reset link.',
    note: 'When you click the reset link, you will be redirected to set a new password.',
  });
}

