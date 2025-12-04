/**
 * API Endpoint: Submit Execution Report
 * POST /api/client/execution-reports/submit
 * 
 * Phase 7.2: Save execution reports to database
 * 
 * Request body:
 * {
 *   report: { ... execution report object ... },
 *   metadata: {
 *     jobId: uuid,
 *     workflowId: uuid,
 *     workflowName: string,
 *     platform: string,
 *     clientId: string,
 *     agentVersion: string
 *   }
 * }
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate request body
    const { report, metadata } = req.body;

    if (!report) {
      return res.status(400).json({ 
        error: 'Missing required field: report' 
      });
    }

    // Create Supabase client with service role key for server-side operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract client authentication from headers
    const clientToken = req.headers.authorization?.replace('Bearer ', '');
    
    // Verify client token if provided
    let userId = metadata.userId;
    if (clientToken) {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('user_id, client_id')
        .eq('api_token', clientToken)
        .single();

      if (!clientError && client) {
        userId = client.user_id;
        metadata.clientId = metadata.clientId || client.client_id;
      }
    }

    // Prepare report for database
    const dbReport = {
      // Relationships
      job_id: metadata.jobId || null,
      workflow_id: metadata.workflowId || null,
      user_id: userId || null,
      
      // Workflow info
      workflow_name: metadata.workflowName || report.workflowId,
      workflow_type: metadata.workflowType || null,
      platform: metadata.platform || null,
      
      // Timing
      start_time: report.startTime,
      end_time: report.endTime,
      duration: report.duration,
      
      // Overall statistics
      total_actions: report.overallStats?.total || 0,
      successful_actions: report.overallStats?.successful || 0,
      failed_actions: report.overallStats?.failed || 0,
      success_rate: report.overallStats?.successRate || 0,
      average_time: report.overallStats?.averageTime || 0,
      average_confidence: report.overallStats?.averageConfidence || 0,
      
      // Method statistics
      method_stats: report.methodStats || {},
      
      // Detailed data
      actions: report.actions || [],
      errors: report.errors || [],
      error_count: (report.errors || []).length,
      
      // Full report for complete data
      full_report: report,
      
      // Metadata
      client_id: metadata.clientId || null,
      agent_version: metadata.agentVersion || null
    };

    // Insert into database
    const { data: insertedReport, error: insertError } = await supabase
      .from('execution_reports')
      .insert(dbReport)
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return res.status(500).json({ 
        error: 'Failed to save execution report',
        details: insertError.message 
      });
    }

    // Update job with report ID if job exists
    if (metadata.jobId && insertedReport.id) {
      const { error: jobUpdateError } = await supabase
        .from('jobs')
        .update({ 
          execution_report_id: insertedReport.id,
          results: {
            executionReportId: insertedReport.id,
            summary: {
              total: report.overallStats?.total || 0,
              successful: report.overallStats?.successful || 0,
              failed: report.overallStats?.failed || 0,
              successRate: report.overallStats?.successRate || 0,
              duration: report.duration
            },
            timestamp: new Date().toISOString()
          },
          processed_at: new Date().toISOString()
        })
        .eq('id', metadata.jobId);

      if (jobUpdateError) {
        console.error('Job update error:', jobUpdateError);
        // Don't fail the request if job update fails
      }
    }

    // Return success
    return res.status(201).json({
      success: true,
      reportId: insertedReport.id,
      message: 'Execution report saved successfully',
      data: {
        id: insertedReport.id,
        workflowName: insertedReport.workflow_name,
        successRate: insertedReport.success_rate,
        duration: insertedReport.duration,
        totalActions: insertedReport.total_actions,
        errors: insertedReport.error_count
      }
    });

  } catch (error) {
    console.error('Execution report submission error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
