/**
 * API Endpoint: Submit Execution Report (Phase 7.2)
 * POST /api/execution-reports/submit
 * 
 * Saves execution report to database after workflow completion
 */

import { ExecutionReportService } from '../../../src/modules-logic/services/execution-report-service.js';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { report, metadata } = req.body;

    // Validate required fields
    if (!report) {
      return res.status(400).json({
        success: false,
        error: 'Execution report is required'
      });
    }

    if (!report.workflowId || !report.startTime || !report.endTime) {
      return res.status(400).json({
        success: false,
        error: 'Invalid report format. Required: workflowId, startTime, endTime'
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

    // Save report to database
    const result = await reportService.saveExecutionReport(report, metadata);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    // Update job if jobId provided
    if (metadata?.jobId && result.data?.id) {
      await reportService.updateJobWithReport(metadata.jobId, result.data.id);
    }

    // Return success with report ID
    return res.status(201).json({
      success: true,
      message: 'Execution report saved successfully',
      data: {
        reportId: result.data.id,
        workflowId: report.workflowId,
        duration: report.duration,
        successRate: report.overallStats.successRate
      }
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
