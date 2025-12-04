/**
 * API Endpoint: List Execution Reports
 * GET /api/client/execution-reports/list
 * 
 * Query parameters:
 * - workflowId: Filter by workflow ID
 * - platform: Filter by platform
 * - limit: Number of results (default: 50, max: 200)
 * - offset: Pagination offset
 * - sortBy: Sort field (start_time, success_rate, duration)
 * - sortOrder: asc or desc (default: desc)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract query parameters
    const {
      workflowId,
      platform,
      limit = 50,
      offset = 0,
      sortBy = 'start_time',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = supabase
      .from('execution_report_summary')
      .select('*', { count: 'exact' });

    // Apply filters
    if (workflowId) {
      query = query.eq('workflow_id', workflowId);
    }

    if (platform) {
      query = query.eq('platform', platform);
    }

    // Apply sorting
    const validSortFields = ['start_time', 'success_rate', 'duration', 'total_actions'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'start_time';
    const ascending = sortOrder === 'asc';
    
    query = query.order(sortField, { ascending });

    // Apply pagination
    const limitNum = Math.min(parseInt(limit) || 50, 200);
    const offsetNum = parseInt(offset) || 0;
    
    query = query.range(offsetNum, offsetNum + limitNum - 1);

    // Execute query
    const { data, error, count } = await query;

    if (error) {
      console.error('Query error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch execution reports',
        details: error.message 
      });
    }

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        total: count,
        limit: limitNum,
        offset: offsetNum,
        hasMore: count > offsetNum + limitNum
      }
    });

  } catch (error) {
    console.error('List execution reports error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
