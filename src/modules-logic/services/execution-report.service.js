/**
 * Execution Report Service
 * Handles saving and retrieving execution reports from the database
 * Phase 7.2 - Database Integration
 */

import { supabase } from '../../modules-view/utils/supabase.js';

export class ExecutionReportService {
  /**
   * Save execution report to database
   * @param {Object} executionReport - Execution report from WorkflowExecutor
   * @param {Object} context - Additional context (jobId, userId, platform, etc.)
   * @returns {Promise<Object>} Saved report with ID
   */
  static async saveExecutionReport(executionReport, context = {}) {
    try {
      // Prepare report data for database
      const reportData = {
        // Relationships
        job_id: context.jobId || null,
        workflow_id: context.workflowId || null,
        user_id: context.userId || null,
        
        // Workflow identification
        workflow_name: context.workflowName || executionReport.workflowId,
        workflow_type: context.workflowType || 'automation',
        platform: context.platform || 'unknown',
        
        // Timing
        start_time: executionReport.startTime,
        end_time: executionReport.endTime,
        duration: executionReport.duration,
        
        // Overall statistics
        total_actions: executionReport.overallStats.total,
        successful_actions: executionReport.overallStats.successful,
        failed_actions: executionReport.overallStats.failed,
        success_rate: executionReport.overallStats.successRate,
        average_time: executionReport.overallStats.averageTime,
        average_confidence: executionReport.overallStats.averageConfidence,
        
        // Method statistics
        method_stats: executionReport.methodStats,
        
        // Detailed action results
        actions: executionReport.actions,
        
        // Error details
        errors: executionReport.errors,
        error_count: executionReport.errors.length,
        
        // Full report for complete data
        full_report: executionReport,
        
        // Metadata
        client_id: context.clientId || null,
        agent_version: context.agentVersion || '1.0.0'
      };
      
      // Insert into database
      const { data, error } = await supabase
        .from('execution_reports')
        .insert([reportData])
        .select()
        .single();
      
      if (error) {
        console.error('❌ Failed to save execution report to database:', error);
        throw error;
      }
      
      console.log(`✅ Execution report saved to database (ID: ${data.id})`);
      
      // Update job with execution_report_id if jobId provided
      if (context.jobId) {
        await this.linkReportToJob(context.jobId, data.id);
      }
      
      return {
        success: true,
        reportId: data.id,
        data
      };
      
    } catch (error) {
      console.error('❌ Error saving execution report:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Link execution report to job
   * @param {string} jobId - Job UUID
   * @param {string} reportId - Report UUID
   */
  static async linkReportToJob(jobId, reportId) {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ execution_report_id: reportId })
        .eq('id', jobId);
      
      if (error) {
        console.error('❌ Failed to link report to job:', error);
      } else {
        console.log(`✅ Report ${reportId} linked to job ${jobId}`);
      }
    } catch (error) {
      console.error('❌ Error linking report to job:', error);
    }
  }
  
  /**
   * Get execution report by ID
   * @param {string} reportId - Report UUID
   * @returns {Promise<Object>} Execution report
   */
  static async getExecutionReport(reportId) {
    try {
      const { data, error } = await supabase
        .from('execution_reports')
        .select('*')
        .eq('id', reportId)
        .single();
      
      if (error) throw error;
      
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('❌ Error retrieving execution report:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get execution reports for a job
   * @param {string} jobId - Job UUID
   * @returns {Promise<Array>} Array of execution reports
   */
  static async getExecutionReportsByJob(jobId) {
    try {
      const { data, error } = await supabase
        .from('execution_reports')
        .select('*')
        .eq('job_id', jobId)
        .order('start_time', { ascending: false });
      
      if (error) throw error;
      
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('❌ Error retrieving execution reports:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get execution reports for a user
   * @param {string} userId - User UUID
   * @param {Object} options - Query options (limit, offset, filters)
   * @returns {Promise<Array>} Array of execution reports
   */
  static async getExecutionReportsByUser(userId, options = {}) {
    try {
      let query = supabase
        .from('execution_reports')
        .select('*')
        .eq('user_id', userId);
      
      // Apply filters
      if (options.platform) {
        query = query.eq('platform', options.platform);
      }
      
      if (options.workflowId) {
        query = query.eq('workflow_id', options.workflowId);
      }
      
      if (options.startDate) {
        query = query.gte('start_time', options.startDate);
      }
      
      if (options.endDate) {
        query = query.lte('start_time', options.endDate);
      }
      
      // Pagination
      query = query.order('start_time', { ascending: false });
      
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return {
        success: true,
        data,
        count: data.length
      };
    } catch (error) {
      console.error('❌ Error retrieving execution reports:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get execution report statistics
   * @param {Object} filters - Filters (userId, platform, dateRange, etc.)
   * @returns {Promise<Object>} Aggregated statistics
   */
  static async getExecutionStatistics(filters = {}) {
    try {
      let query = supabase
        .from('execution_reports')
        .select('success_rate, average_confidence, platform, workflow_name, duration');
      
      // Apply filters
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      
      if (filters.platform) {
        query = query.eq('platform', filters.platform);
      }
      
      if (filters.startDate) {
        query = query.gte('start_time', filters.startDate);
      }
      
      if (filters.endDate) {
        query = query.lte('start_time', filters.endDate);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Calculate aggregated statistics
      if (data.length === 0) {
        return {
          success: true,
          stats: {
            totalExecutions: 0,
            averageSuccessRate: 0,
            averageConfidence: 0,
            averageDuration: 0,
            byPlatform: {},
            byWorkflow: {}
          }
        };
      }
      
      const stats = {
        totalExecutions: data.length,
        averageSuccessRate: (data.reduce((sum, r) => sum + parseFloat(r.success_rate), 0) / data.length).toFixed(2),
        averageConfidence: (data.reduce((sum, r) => sum + (parseFloat(r.average_confidence) || 0), 0) / data.length).toFixed(3),
        averageDuration: Math.round(data.reduce((sum, r) => sum + r.duration, 0) / data.length),
        
        // By platform
        byPlatform: data.reduce((acc, r) => {
          if (!acc[r.platform]) {
            acc[r.platform] = { count: 0, successRate: 0 };
          }
          acc[r.platform].count++;
          acc[r.platform].successRate = (
            (acc[r.platform].successRate * (acc[r.platform].count - 1) + parseFloat(r.success_rate)) /
            acc[r.platform].count
          ).toFixed(2);
          return acc;
        }, {}),
        
        // By workflow
        byWorkflow: data.reduce((acc, r) => {
          const key = r.workflow_name || 'unknown';
          if (!acc[key]) {
            acc[key] = { count: 0, successRate: 0 };
          }
          acc[key].count++;
          acc[key].successRate = (
            (acc[key].successRate * (acc[key].count - 1) + parseFloat(r.success_rate)) /
            acc[key].count
          ).toFixed(2);
          return acc;
        }, {})
      };
      
      return {
        success: true,
        stats
      };
    } catch (error) {
      console.error('❌ Error retrieving execution statistics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get error analysis
   * @param {Object} filters - Filters
   * @returns {Promise<Object>} Error analysis
   */
  static async getErrorAnalysis(filters = {}) {
    try {
      let query = supabase
        .from('execution_reports')
        .select('errors, workflow_name, platform, start_time')
        .gt('error_count', 0);
      
      // Apply filters
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      
      if (filters.platform) {
        query = query.eq('platform', filters.platform);
      }
      
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      
      query = query.order('start_time', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Analyze errors
      const errorAnalysis = {
        totalReportsWithErrors: data.length,
        totalErrors: data.reduce((sum, r) => sum + r.errors.length, 0),
        errorsByType: {},
        errorsByAction: {},
        commonErrors: []
      };
      
      data.forEach(report => {
        report.errors.forEach(err => {
          // By error message
          const errorKey = err.error || 'unknown';
          errorAnalysis.errorsByType[errorKey] = (errorAnalysis.errorsByType[errorKey] || 0) + 1;
          
          // By action type
          const actionKey = err.actionType || 'unknown';
          errorAnalysis.errorsByAction[actionKey] = (errorAnalysis.errorsByAction[actionKey] || 0) + 1;
        });
      });
      
      // Find most common errors
      errorAnalysis.commonErrors = Object.entries(errorAnalysis.errorsByType)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([error, count]) => ({ error, count }));
      
      return {
        success: true,
        analysis: errorAnalysis
      };
    } catch (error) {
      console.error('❌ Error analyzing errors:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
