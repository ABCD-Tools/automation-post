-- Migration 003: Execution Reports (Phase 7.2)
-- Stores detailed execution reports for workflow runs

-- Create execution_reports table
create table if not exists public.execution_reports (
    id uuid primary key default uuid_generate_v4(),
    
    -- Relationships
    job_id uuid references public.jobs(id) on delete cascade,
    workflow_id uuid references public.workflows(id) on delete set null,
    user_id uuid references public.users(id) on delete cascade,
    
    -- Workflow identification
    workflow_name varchar(255),
    workflow_type varchar(50),
    platform varchar(50),
    
    -- Timing
    start_time timestamptz not null,
    end_time timestamptz not null,
    duration integer not null, -- milliseconds
    
    -- Overall statistics
    total_actions integer not null default 0,
    successful_actions integer not null default 0,
    failed_actions integer not null default 0,
    success_rate numeric(5,2) not null default 0, -- percentage
    average_time integer, -- milliseconds
    average_confidence numeric(4,3), -- 0.000 to 1.000
    
    -- Method statistics (JSONB for flexibility)
    method_stats jsonb default '{
        "selector": {"count": 0, "totalTime": 0},
        "text": {"count": 0, "totalTime": 0},
        "visual": {"count": 0, "totalTime": 0},
        "position": {"count": 0, "totalTime": 0},
        "failed": {"count": 0, "totalTime": 0}
    }'::jsonb,
    
    -- Detailed action results
    actions jsonb not null default '[]'::jsonb,
    
    -- Error details
    errors jsonb default '[]'::jsonb,
    error_count integer not null default 0,
    
    -- Full report (for complete data)
    full_report jsonb,
    
    -- Metadata
    client_id varchar(100), -- Which client executed this
    agent_version varchar(20),
    
    created_at timestamptz default timezone('utc', now())
);

-- Indexes for performance
create index if not exists idx_execution_reports_job_id on public.execution_reports (job_id);
create index if not exists idx_execution_reports_workflow_id on public.execution_reports (workflow_id);
create index if not exists idx_execution_reports_user_id on public.execution_reports (user_id);
create index if not exists idx_execution_reports_start_time on public.execution_reports (start_time desc);
create index if not exists idx_execution_reports_success_rate on public.execution_reports (success_rate);
create index if not exists idx_execution_reports_platform on public.execution_reports (platform);

-- Index for error analysis
create index if not exists idx_execution_reports_errors on public.execution_reports using gin (errors);

-- Index for method stats analysis
create index if not exists idx_execution_reports_method_stats on public.execution_reports using gin (method_stats);

-- Update jobs table to include execution_report_id reference
alter table public.jobs 
add column if not exists execution_report_id uuid references public.execution_reports(id) on delete set null;

-- Create view for execution report summary
create or replace view public.execution_report_summary as
select 
    er.id,
    er.job_id,
    er.workflow_name,
    er.platform,
    er.start_time,
    er.duration,
    er.total_actions,
    er.successful_actions,
    er.failed_actions,
    er.success_rate,
    er.average_confidence,
    er.error_count,
    u.email as user_email,
    w.name as workflow_full_name
from public.execution_reports er
left join public.users u on er.user_id = u.id
left join public.workflows w on er.workflow_id = w.id
order by er.start_time desc;

-- Create view for error analysis
create or replace view public.execution_errors_analysis as
select 
    er.id as report_id,
    er.workflow_name,
    er.platform,
    er.start_time,
    jsonb_array_elements(er.errors) as error_detail
from public.execution_reports er
where jsonb_array_length(er.errors) > 0
order by er.start_time desc;

-- Create view for method performance analysis (FIXED)
create or replace view public.method_performance_analysis as
select 
    er.platform,
    er.workflow_name,
    count(*) as execution_count,
    avg(er.success_rate) as avg_success_rate,
    avg(((er.method_stats->'selector'->>'count')::integer)) as avg_selector_usage,
    avg(((er.method_stats->'text'->>'count')::integer)) as avg_text_usage,
    avg(((er.method_stats->'visual'->>'count')::integer)) as avg_visual_usage,
    avg(((er.method_stats->'position'->>'count')::integer)) as avg_position_usage,
    avg(er.average_confidence) as avg_confidence
from public.execution_reports er
group by er.platform, er.workflow_name
order by count(*) desc;

-- Grant permissions (adjust based on your RLS policies)
-- These are examples - modify based on your security requirements
grant select on public.execution_reports to authenticated;
grant insert on public.execution_reports to authenticated;
grant select on public.execution_report_summary to authenticated;
grant select on public.execution_errors_analysis to authenticated;
grant select on public.method_performance_analysis to authenticated;

-- Row Level Security (RLS) policies
alter table public.execution_reports enable row level security;

-- Users can only see their own execution reports
create policy "Users can view their own execution reports"
    on public.execution_reports
    for select
    using (auth.uid() = user_id);

-- Users can insert their own execution reports
create policy "Users can insert their own execution reports"
    on public.execution_reports
    for insert
    with check (auth.uid() = user_id);

-- Comment on table
comment on table public.execution_reports is 'Stores detailed execution reports for workflow runs with method statistics, timing, and error details';
comment on column public.execution_reports.method_stats is 'Statistics for each execution method (selector, text, visual, position)';
comment on column public.execution_reports.actions is 'Array of individual action results with timing and confidence scores';
comment on column public.execution_reports.errors is 'Array of detailed error information including screenshots and page state';
comment on column public.execution_reports.full_report is 'Complete execution report in JSON format for detailed analysis';