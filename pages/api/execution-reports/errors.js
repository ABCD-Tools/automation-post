/**
 * API Endpoint: Get Error Analysis
 * GET /api/execution-reports/errors
 * 
 * Phase 7.2 - Part 2: Retrieve error analysis and patterns
 */

import { ExecutionReportService } from '../../../src/modules-logic/services/execution-report.service.js';

/**
 * @swagger
 * /api/execution-reports/errors:
 *   get:
 *     summary: Get error analysis
 *     description: Retrieve error analysis with patterns and frequencies
 *     tags:
 *       - Execution Reports
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *         description: Filter by platform
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Limit number of results
 *     responses:
 *       200:
 *         description: Error analysis retrieved
 *       500:
 *         description: Server error
 */
export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET.'
    });
  }
  
  try {
    const { userId, platform, limit } = req.query;
    
    const filters = {};
    if (userId) filters.userId = userId;
    if (platform) filters.platform = platform;
    if (limit) filters.limit = parseInt(limit);
    
    // Get error analysis
    const result = await ExecutionReportService.getErrorAnalysis(filters);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }
    
    return res.status(200).json({
      success: true,
      analysis: result.analysis
    });
    
  } catch (error) {
    console.error('❌ Error retrieving error analysis:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
