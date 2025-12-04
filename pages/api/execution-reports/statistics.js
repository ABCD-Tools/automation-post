/**
 * API Endpoint: Get Execution Statistics
 * GET /api/execution-reports/statistics
 * 
 * Phase 7.2 - Part 2: Retrieve aggregated execution statistics
 */

import { ExecutionReportService } from '../../../src/modules-logic/services/execution-report.service.js';

/**
 * @swagger
 * /api/execution-reports/statistics:
 *   get:
 *     summary: Get execution statistics
 *     description: Retrieve aggregated execution statistics with filters
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
 *         description: Filter by platform (instagram, facebook, etc.)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by end date
 *     responses:
 *       200:
 *         description: Statistics retrieved
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
    const { userId, platform, startDate, endDate } = req.query;
    
    const filters = {};
    if (userId) filters.userId = userId;
    if (platform) filters.platform = platform;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    
    // Get statistics
    const result = await ExecutionReportService.getExecutionStatistics(filters);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }
    
    return res.status(200).json({
      success: true,
      statistics: result.stats
    });
    
  } catch (error) {
    console.error('❌ Error retrieving execution statistics:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
