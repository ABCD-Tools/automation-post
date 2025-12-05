import { authenticateRequest } from '@modules-logic/middleware/auth';
import { ExecutionReportService } from '@modules-logic/services/execution-report-service';

/**
 * @swagger
 * /api/execution-reports/{id}/retry:
 *   post:
 *     summary: Retry a failed execution report by creating a new job
 *     tags: [Execution Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Execution report ID
 *     responses:
 *       200:
 *         description: Job created for retry
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     job:
 *                       type: object
 *                     message:
 *                       type: string
 *       400:
 *         description: Cannot retry successful report or invalid request
 *       404:
 *         description: Execution report not found
 *       401:
 *         description: Unauthorized
 */
export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Execution report ID is required'
    });
  }

  try {
    // Authenticate user
    const user = await authenticateRequest(req);
    if (!user || !user.id) {
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized' 
      });
    }

    // Initialize service
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        success: false,
        error: 'Database configuration missing'
      });
    }

    const reportService = new ExecutionReportService(supabaseUrl, supabaseKey);

    // Retry execution report
    const result = await reportService.retryExecutionReport(user.id, id);

    if (!result.success) {
      if (result.error?.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: result.error
        });
      }
      
      if (result.error?.includes('Cannot retry') || result.error?.includes('Access denied')) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to retry execution report'
      });
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

