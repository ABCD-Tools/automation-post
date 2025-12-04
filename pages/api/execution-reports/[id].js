/**
 * API Endpoint: Get Execution Report by ID
 * GET /api/execution-reports/[id]
 */

import { ExecutionReportService } from '../../../src/modules-logic/services/execution-report-service.js';

export default async function handler(req, res) {
  const { id } = req.query;

  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Report ID is required'
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

    // Get report
    const result = await reportService.getExecutionReport(id);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
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
