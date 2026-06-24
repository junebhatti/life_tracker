-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query)
-- to create the tables Life Tracker syncs Tasks, Projects, and Routines through.

create table if not exists public.tasks (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  project_id text,
  due text,
  recurrence text,
  starred boolean not null default false,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.projects (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  client text,
  color text not null default '#6b7280',
  type text not null default 'active',
  target text,
  milestones jsonb not null default '[]',
  checklist jsonb not null default '[]',
  activity jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists public.routines (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  period text not null default 'Morning',
  streak_goal integer,
  history jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists routines_user_id_idx on public.routines (user_id);

alter table public.tasks enable row level security;
alter table public.projects enable row level security;
alter table public.routines enable row level security;

-- Each signed-in user can only see and modify their own rows.
create policy "tasks_select_own" on public.tasks for select using (auth.uid() = user_id);
create policy "tasks_insert_own" on public.tasks for insert with check (auth.uid() = user_id);
create policy "tasks_update_own" on public.tasks for update using (auth.uid() = user_id);
create policy "tasks_delete_own" on public.tasks for delete using (auth.uid() = user_id);

create policy "projects_select_own" on public.projects for select using (auth.uid() = user_id);
create policy "projects_insert_own" on public.projects for insert with check (auth.uid() = user_id);
create policy "projects_update_own" on public.projects for update using (auth.uid() = user_id);
create policy "projects_delete_own" on public.projects for delete using (auth.uid() = user_id);

create policy "routines_select_own" on public.routines for select using (auth.uid() = user_id);
create policy "routines_insert_own" on public.routines for insert with check (auth.uid() = user_id);
create policy "routines_update_own" on public.routines for update using (auth.uid() = user_id);
create policy "routines_delete_own" on public.routines for delete using (auth.uid() = user_id);

-- Broadcast row changes so other open tabs/devices update live.
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.routines;
