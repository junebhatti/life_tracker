-- Run this in the Supabase SQL editor (Project > SQL Editor > New query).
-- Safe to paste and run in full at any time, no matter what you've already
-- run before — every statement only creates/changes what's missing.

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

create table if not exists public.people (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- Notes synced in from a Markdown vault (e.g. Obsidian), one row per file
-- path. Synced again on the same path updates the row instead of duplicating.
create table if not exists public.library_notes (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  path text not null,
  title text not null,
  content text not null default '',
  tags jsonb not null default '[]',
  manual_tags jsonb not null default '[]',
  manual_title text,
  manual_content text,
  category text,
  person_ids jsonb not null default '[]',
  source_modified_at timestamptz,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, path)
);

-- In case library_notes was created before these two columns existed.
alter table public.library_notes add column if not exists manual_tags jsonb not null default '[]';
alter table public.library_notes add column if not exists category text;
alter table public.library_notes add column if not exists manual_title text;
alter table public.library_notes add column if not exists manual_content text;

-- Manually logged income/expense entries for the Budget tracker.
create table if not exists public.budget_transactions (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric not null,
  type text not null default 'expense',
  description text not null,
  category text,
  date text not null,
  created_at timestamptz not null default now()
);

create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists routines_user_id_idx on public.routines (user_id);
create index if not exists people_user_id_idx on public.people (user_id);
create index if not exists library_notes_user_id_idx on public.library_notes (user_id);
create index if not exists budget_transactions_user_id_idx on public.budget_transactions (user_id);

alter table public.tasks enable row level security;
alter table public.projects enable row level security;
alter table public.routines enable row level security;
alter table public.people enable row level security;
alter table public.library_notes enable row level security;
alter table public.budget_transactions enable row level security;

-- Each signed-in user can only see and modify their own rows.
-- Dropped and recreated each run so this script stays safe to re-paste.
drop policy if exists "tasks_select_own" on public.tasks;
drop policy if exists "tasks_insert_own" on public.tasks;
drop policy if exists "tasks_update_own" on public.tasks;
drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_select_own" on public.tasks for select using (auth.uid() = user_id);
create policy "tasks_insert_own" on public.tasks for insert with check (auth.uid() = user_id);
create policy "tasks_update_own" on public.tasks for update using (auth.uid() = user_id);
create policy "tasks_delete_own" on public.tasks for delete using (auth.uid() = user_id);

drop policy if exists "projects_select_own" on public.projects;
drop policy if exists "projects_insert_own" on public.projects;
drop policy if exists "projects_update_own" on public.projects;
drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_select_own" on public.projects for select using (auth.uid() = user_id);
create policy "projects_insert_own" on public.projects for insert with check (auth.uid() = user_id);
create policy "projects_update_own" on public.projects for update using (auth.uid() = user_id);
create policy "projects_delete_own" on public.projects for delete using (auth.uid() = user_id);

drop policy if exists "routines_select_own" on public.routines;
drop policy if exists "routines_insert_own" on public.routines;
drop policy if exists "routines_update_own" on public.routines;
drop policy if exists "routines_delete_own" on public.routines;
create policy "routines_select_own" on public.routines for select using (auth.uid() = user_id);
create policy "routines_insert_own" on public.routines for insert with check (auth.uid() = user_id);
create policy "routines_update_own" on public.routines for update using (auth.uid() = user_id);
create policy "routines_delete_own" on public.routines for delete using (auth.uid() = user_id);

drop policy if exists "people_select_own" on public.people;
drop policy if exists "people_insert_own" on public.people;
drop policy if exists "people_update_own" on public.people;
drop policy if exists "people_delete_own" on public.people;
create policy "people_select_own" on public.people for select using (auth.uid() = user_id);
create policy "people_insert_own" on public.people for insert with check (auth.uid() = user_id);
create policy "people_update_own" on public.people for update using (auth.uid() = user_id);
create policy "people_delete_own" on public.people for delete using (auth.uid() = user_id);

drop policy if exists "library_notes_select_own" on public.library_notes;
drop policy if exists "library_notes_insert_own" on public.library_notes;
drop policy if exists "library_notes_update_own" on public.library_notes;
drop policy if exists "library_notes_delete_own" on public.library_notes;
create policy "library_notes_select_own" on public.library_notes for select using (auth.uid() = user_id);
create policy "library_notes_insert_own" on public.library_notes for insert with check (auth.uid() = user_id);
create policy "library_notes_update_own" on public.library_notes for update using (auth.uid() = user_id);
create policy "library_notes_delete_own" on public.library_notes for delete using (auth.uid() = user_id);

drop policy if exists "budget_transactions_select_own" on public.budget_transactions;
drop policy if exists "budget_transactions_insert_own" on public.budget_transactions;
drop policy if exists "budget_transactions_update_own" on public.budget_transactions;
drop policy if exists "budget_transactions_delete_own" on public.budget_transactions;
create policy "budget_transactions_select_own" on public.budget_transactions for select using (auth.uid() = user_id);
create policy "budget_transactions_insert_own" on public.budget_transactions for insert with check (auth.uid() = user_id);
create policy "budget_transactions_update_own" on public.budget_transactions for update using (auth.uid() = user_id);
create policy "budget_transactions_delete_own" on public.budget_transactions for delete using (auth.uid() = user_id);

-- Broadcast row changes so other open tabs/devices update live.
-- Guarded so re-running doesn't error on tables already added.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks') then
    alter publication supabase_realtime add table public.tasks;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'projects') then
    alter publication supabase_realtime add table public.projects;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'routines') then
    alter publication supabase_realtime add table public.routines;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'people') then
    alter publication supabase_realtime add table public.people;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'library_notes') then
    alter publication supabase_realtime add table public.library_notes;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'budget_transactions') then
    alter publication supabase_realtime add table public.budget_transactions;
  end if;
end $$;
