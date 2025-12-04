// Supabase handles email verification via magic link. This endpoint can be
// extended later if you want a custom verification flow. For now it just
// confirms the request is reachable.

/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     summary: Email verification status
 *     tags: [Authentication]
 *     description: Supabase handles email verification via magic links. This endpoint confirms the verification flow is available.
 *     responses:
 *       200:
 *         description: Verification information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Verification handled by Supabase
 */
export default async function handler(req, res) {
  return res.status(200).json({ message: 'Verification handled by Supabase' });
}
