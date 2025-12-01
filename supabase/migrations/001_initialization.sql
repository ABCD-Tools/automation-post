-- Enable UUID generation support
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create table if not exists public.users (
    id uuid primary key default uuid_generate_v4(),
    email varchar(255) unique not null,
    password_hash varchar(255) not null,
    email_verified boolean default false,
    tier varchar(20) default 'free',
    created_at timestamptz default timezone('utc', now()),
    updated_at timestamptz default timezone('utc', now())
);

create table if not exists public.clients (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references public.users(id) on delete cascade,
    client_id varchar(100) unique not null,
    client_name varchar(255),
    install_path text,
    platform varchar(50),
    os_version varchar(100),
    status varchar(20),
    api_token text not null,
    token_expires_at timestamptz,
    installed_at timestamptz default timezone('utc', now()),
    last_seen timestamptz,
    last_heartbeat timestamptz,
    agent_version varchar(20),
    total_jobs integer default 0
);

create table if not exists public.accounts (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references public.users(id) on delete cascade,
    platform varchar(50),
    username varchar(255),
    encrypted_password text not null,
    encrypted_cookies text,
    status varchar(20),
    last_verified_at timestamptz,
    last_used_at timestamptz,
    created_at timestamptz default timezone('utc', now())
);

create table if not exists public.jobs (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references public.users(id) on delete cascade,
    job_type varchar(50),
    status varchar(20),
    content jsonb,
    target_accounts uuid[],
    results jsonb,
    created_at timestamptz default timezone('utc', now()),
    processed_at timestamptz,
    expires_at timestamptz
);

create table if not exists public.micro_actions (
    id uuid primary key default uuid_generate_v4(),
    name varchar(255) not null,
    description text,
    type varchar(50),
    platform varchar(50),
    params jsonb,
    created_by uuid references public.users(id),
    created_at timestamptz default timezone('utc', now()),
    version varchar(20) default '1.0.0'
);

create table if not exists public.workflows (
    id uuid primary key default uuid_generate_v4(),
    name varchar(255) not null,
    platform varchar(50),
    type varchar(50),
    steps jsonb,
    requires_auth boolean default false,
    auth_workflow_id uuid references public.workflows(id),
    is_active boolean default true,
    created_by uuid references public.users(id),
    created_at timestamptz default timezone('utc', now()),
    version varchar(20) default '1.0.0'
);

-- Helpful indexes
create index if not exists idx_clients_user_id on public.clients (user_id);
create index if not exists idx_accounts_user_id on public.accounts (user_id);
create index if not exists idx_jobs_user_id on public.jobs (user_id);

