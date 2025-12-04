/**
 * API Endpoint: Get Dashboard Statistics
 * GET /api/execution-reports/dashboard
 * 
 * Query params:
 * - platform: Filter by platform
 * - startDate: Start date filter
 * - endDate: End date filter
 */

import { ExecutionReportService } from '../../../src/modules-logic/services/execution-report-service.js';
import { verifyToken } from '../../../src/modules-logic/middleware/auth.js';

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    // Verify authentication
    const authResult = await verifyToken(req);
    if (!authResult.valid) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const userId = authResult.userId;
    const { platform, startDate, endDate } = req.query;

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

    // Get dashboard statistics
    const result = await reportService.getDashboardStats(userId, {
      platform,
      startDate,
      endDate
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
