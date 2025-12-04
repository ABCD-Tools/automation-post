/**
 * API Endpoint: Get Execution Report by ID
 * GET /api/client/execution-reports/[id]
 * 
 * Returns full execution report including detailed actions and errors
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Report ID is required' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get full report
    const { data, error } = await supabase
      .from('execution_reports')
      .select(`
        *,
        job:jobs(id, job_type, status, created_at),
        workflow:workflows(id, name, type, platform),
        user:users(id, email)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Execution report not found' });
      }
      console.error('Query error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch execution report',
        details: error.message 
      });
    }

    return res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Get execution report error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
