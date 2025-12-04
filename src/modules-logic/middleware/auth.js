import { getUserFromAccessToken } from '@modules-logic/services/auth.js';

/**
 * Middleware to authenticate API requests using JWT token
 * @param {Object} req - Request object
 * @returns {Promise<Object>} User object if authenticated
 * @throws {Error} If authentication fails
 */
export async function authenticateRequest(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const user = await getUserFromAccessToken(token);
    return user;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}
