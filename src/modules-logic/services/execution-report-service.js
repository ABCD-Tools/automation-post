/**
 * Execution Report Service (Phase 7.2)
 * Handles saving and retrieving execution reports from database
 */

import { createClient } from '@supabase/supabase-js';

export class ExecutionReportService {
  constructor(supabaseUrl, supabaseKey) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Save execution report to database
   * @param {Object} report - Execution report from WorkflowExecutor
   * @param {Object} metadata - Additional metadata (jobId, userId, etc.)
   * @returns {Promise<Object>} Database insert result
   */
  async saveExecutionReport(report, metadata = {}) {
    try {
      // Extract statistics from report
      const reportData = {
        // Relationships
        job_id: metadata.jobId || null,
        workflow_id: metadata.workflowId || null,
        user_id: metadata.userId || null,
        
        // Workflow identification
        workflow_name: metadata.workflowName || report.workflowId || 'Unknown',
        workflow_type: metadata.workflowType || 'automation',
        platform: metadata.platform || 'unknown',
        
        // Timing
        start_time: report.startTime,
        end_time: report.endTime,
        duration: report.duration,
        
        // Overall statistics
        total_actions: report.overallStats.total,
        successful_actions: report.overallStats.successful,
        failed_actions: report.overallStats.failed,
        success_rate: report.overallStats.successRate,
        average_time: report.overallStats.averageTime,
        average_confidence: report.overallStats.averageConfidence,
        
        // Method statistics
        method_stats: report.methodStats,
        
        // Detailed actions
        actions: report.actions,
        
        // Errors
        errors: report.errors,
        error_count: report.errors.length,
        
        // Full report
        full_report: report,
        
        // Metadata
        client_id: metadata.clientId || 'unknown',
        agent_version: metadata.agentVersion || '1.0.0'
      };

      const { data, error } = await this.supabase
        .from('execution_reports')
        .insert([reportData])
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to save execution report:', error);
        throw error;
      }

      console.log('✅ Execution report saved to database:', data.id);
      return { success: true, data };

    } catch (error) {
      console.error('❌ Error in saveExecutionReport:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update job with execution report ID
   * @param {string} jobId - Job ID
   * @param {string} reportId - Execution report ID
   */
  async updateJobWithReport(jobId, reportId) {
    try {
      const { error } = await this.supabase
        .from('jobs')
        .update({ 
          execution_report_id: reportId,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (error) {
        console.error('❌ Failed to update job with report:', error);
        throw error;
      }

      console.log('✅ Job updated with execution report ID');
      return { success: true };

    } catch (error) {
      console.error('❌ Error in updateJobWithReport:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get execution report by ID
   * @param {string} reportId - Report ID
   * @returns {Promise<Object>} Execution report
   */
  async getExecutionReport(reportId) {
    try {
      const { data, error } = await this.supabase
        .from('execution_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error) throw error;

      return { success: true, data };

    } catch (error) {
      console.error('❌ Error fetching execution report:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get execution reports for a job
   * @param {string} jobId - Job ID
   * @returns {Promise<Array>} Execution reports
   */
  async getReportsByJob(jobId) {
    try {
      const { data, error } = await this.supabase
        .from('execution_reports')
        .select('*')
        .eq('job_id', jobId)
        .order('start_time', { ascending: false });

      if (error) throw error;

      return { success: true, data };

    } catch (error) {
      console.error('❌ Error fetching reports by job:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get execution reports for a workflow
   * @param {string} workflowId - Workflow ID
   * @param {Object} options - Query options (limit, offset)
   * @returns {Promise<Array>} Execution reports
   */
  async getReportsByWorkflow(workflowId, options = {}) {
    try {
      let query = this.supabase
        .from('execution_reports')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('start_time', { ascending: false });

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data };

    } catch (error) {
      console.error('❌ Error fetching reports by workflow:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get execution report summary
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Report summaries
   */
  async getReportSummaries(filters = {}) {
    try {
      let query = this.supabase
        .from('execution_report_summary')
        .select('*')
        .order('start_time', { ascending: false });

      if (filters.platform) {
        query = query.eq('platform', filters.platform);
      }

      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data };

    } catch (error) {
      console.error('❌ Error fetching report summaries:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get error analysis
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Error analysis data
   */
  async getErrorAnalysis(filters = {}) {
    try {
      let query = this.supabase
        .from('execution_errors_analysis')
        .select('*')
        .order('start_time', { ascending: false });

      if (filters.platform) {
        query = query.eq('platform', filters.platform);
      }

      if (filters.workflowName) {
        query = query.eq('workflow_name', filters.workflowName);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data };

    } catch (error) {
      console.error('❌ Error fetching error analysis:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get method performance analysis
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Method performance data
   */
  async getMethodPerformance(filters = {}) {
    try {
      let query = this.supabase
        .from('method_performance_analysis')
        .select('*')
        .order('execution_count', { ascending: false });

      if (filters.platform) {
        query = query.eq('platform', filters.platform);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data };

    } catch (error) {
      console.error('❌ Error fetching method performance:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get dashboard statistics
   * @param {string} userId - User ID
   * @param {Object} filters - Filter options (date range, platform)
   * @returns {Promise<Object>} Dashboard statistics
   */
  async getDashboardStats(userId, filters = {}) {
    try {
      let query = this.supabase
        .from('execution_reports')
        .select('*')
        .eq('user_id', userId);

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

      // Calculate dashboard statistics
      const totalExecutions = data.length;
      const totalActions = data.reduce((sum, r) => sum + r.total_actions, 0);
      const successfulExecutions = data.filter(r => r.success_rate === 100).length;
      const avgSuccessRate = totalExecutions > 0
        ? data.reduce((sum, r) => sum + r.success_rate, 0) / totalExecutions
        : 0;
      const avgConfidence = totalExecutions > 0
        ? data.reduce((sum, r) => sum + (r.average_confidence || 0), 0) / totalExecutions
        : 0;
      const totalErrors = data.reduce((sum, r) => sum + r.error_count, 0);

      // Method usage
      const methodUsage = {
        selector: 0,
        text: 0,
        visual: 0,
        position: 0
      };

      data.forEach(report => {
        if (report.method_stats) {
          Object.keys(methodUsage).forEach(method => {
            methodUsage[method] += report.method_stats[method]?.count || 0;
          });
        }
      });

      return {
        success: true,
        data: {
          totalExecutions,
          totalActions,
          successfulExecutions,
          avgSuccessRate: avgSuccessRate.toFixed(2),
          avgConfidence: avgConfidence.toFixed(3),
          totalErrors,
          methodUsage,
          recentReports: data.slice(0, 10)
        }
      };

    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error.message);
      return { success: false, error: error.message };
    }
  }
}

export default ExecutionReportService;
