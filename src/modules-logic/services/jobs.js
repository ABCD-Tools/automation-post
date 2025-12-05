import { createSupabaseServiceRoleClient } from '@modules-view/utils/supabase.js';

const supabase = createSupabaseServiceRoleClient();

/**
 * Get a single job by ID
 * @param {string} userId - Supabase auth user ID
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Job object
 */
export async function getJob(userId, jobId) {
  const { data: job, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Job not found');
    }
    throw new Error(`Failed to fetch job: ${error.message}`);
  }

  if (!job) {
    throw new Error('Job not found or access denied');
  }

  return job;
}

/**
 * Cancel a job (update status to cancelled)
 * @param {string} userId - Supabase auth user ID
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Updated job object
 */
export async function cancelJob(userId, jobId) {
  // Verify job belongs to user
  const { data: existingJob, error: checkError } = await supabase
    .from('jobs')
    .select('id, status')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single();

  if (checkError || !existingJob) {
    throw new Error('Job not found or access denied');
  }

  // Only cancel jobs that are queued or processing
  if (existingJob.status === 'completed' || existingJob.status === 'failed') {
    throw new Error(`Cannot cancel job with status: ${existingJob.status}`);
  }

  const { data: job, error } = await supabase
    .from('jobs')
    .update({ 
      status: 'cancelled',
      processed_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to cancel job: ${error.message}`);
  }

  return job;
}

