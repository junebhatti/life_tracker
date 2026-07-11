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
alter table public.library_notes add column if not exists archived_at timestamptz;
-- Podcast episodes are stored as library notes (category 'Podcasts'); this holds
-- their extra metadata (source URL, cover art, show/host) that plain notes lack.
alter table public.library_notes add column if not exists metadata jsonb;

-- Places visited worldwide for the Map feature.
create table if not exists public.map_places (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  city text not null,
  neighborhood text,
  lat double precision not null,
  lng double precision not null,
  notes text not null default '',
  images jsonb not null default '[]',
  boundary_geojson jsonb,
  visited_at date,
  created_at timestamptz not null default now()
);

create index if not exists map_places_user_id_idx on public.map_places (user_id);
create index if not exists map_places_city_idx on public.map_places (user_id, city);

-- In case map_places was created before these columns existed.
alter table public.map_places add column if not exists boundary_geojson jsonb;
alter table public.map_places add column if not exists official_name text;

alter table public.map_places enable row level security;
drop policy if exists "map_places_select_own" on public.map_places;
drop policy if exists "map_places_insert_own" on public.map_places;
drop policy if exists "map_places_update_own" on public.map_places;
drop policy if exists "map_places_delete_own" on public.map_places;
create policy "map_places_select_own" on public.map_places for select using (auth.uid() = user_id);
create policy "map_places_insert_own" on public.map_places for insert with check (auth.uid() = user_id);
create policy "map_places_update_own" on public.map_places for update using (auth.uid() = user_id);
create policy "map_places_delete_own" on public.map_places for delete using (auth.uid() = user_id);

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

-- In case budget_transactions was created before this column existed: lets
-- Plaid-synced rows dedupe on re-sync without colliding with manual entries
-- (which leave this null; Postgres treats multiple nulls as non-conflicting).
alter table public.budget_transactions add column if not exists external_id text;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'budget_transactions_user_external_unique'
  ) then
    alter table public.budget_transactions
      add constraint budget_transactions_user_external_unique unique (user_id, external_id);
  end if;
end $$;

-- One row per civil day, captured whenever the Health snapshot is fetched
-- successfully, so sleep/RHR/steps can be graphed over time on the Trends page.
create table if not exists public.health_metrics_daily (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date text not null,
  sleep_hours numeric,
  resting_heart_rate numeric,
  steps integer,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists health_metrics_daily_user_id_idx on public.health_metrics_daily (user_id);
alter table public.health_metrics_daily enable row level security;

drop policy if exists "health_metrics_daily_select_own" on public.health_metrics_daily;
create policy "health_metrics_daily_select_own" on public.health_metrics_daily for select using (auth.uid() = user_id);
-- No insert/update/delete policies: only server routes using the service-role
-- key (which bypasses RLS) write these rows.

-- Scrapbook items — freeform canvas cards shared across web and mobile.
-- Uses an `owner` text field instead of user_id FK so a single row always
-- represents "this installation's" scrapbook without requiring Supabase Auth.
-- All access goes through service-role API routes (no RLS needed).
create table if not exists public.scrap_items (
  id text primary key,
  owner text not null default 'default',
  type text not null,
  x numeric not null default 0,
  y numeric not null default 0,
  w numeric not null default 200,
  h numeric,
  rot numeric,
  label text,
  text text,
  source text,
  url text,
  created_at timestamptz not null default now()
);
create index if not exists scrap_items_owner_idx on public.scrap_items (owner);

-- English vocabulary words for the flashcards/reference-list "English
-- Vocabulary" project. `definition` is nullable — a word can be captured
-- while reading and filled in with a definition later.
create table if not exists public.vocab_words (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  word text not null,
  definition text,
  created_at timestamptz not null default now()
);
-- Part of speech, an example sentence, and synonyms — all optional, filled in
-- from the word detail sheet whenever there's time.
alter table public.vocab_words add column if not exists pos text;
alter table public.vocab_words add column if not exists example text;
alter table public.vocab_words add column if not exists synonyms jsonb not null default '[]';
create index if not exists vocab_words_user_id_idx on public.vocab_words (user_id);
alter table public.vocab_words enable row level security;

drop policy if exists "vocab_words_select_own" on public.vocab_words;
drop policy if exists "vocab_words_insert_own" on public.vocab_words;
drop policy if exists "vocab_words_update_own" on public.vocab_words;
drop policy if exists "vocab_words_delete_own" on public.vocab_words;
create policy "vocab_words_select_own" on public.vocab_words for select using (auth.uid() = user_id);
create policy "vocab_words_insert_own" on public.vocab_words for insert with check (auth.uid() = user_id);
create policy "vocab_words_update_own" on public.vocab_words for update using (auth.uid() = user_id);
create policy "vocab_words_delete_own" on public.vocab_words for delete using (auth.uid() = user_id);

-- Spaced-repetition schedule, one row per flashcard the user has graded.
-- Covers both decks via a namespaced card_key ("english:<wordId>" /
-- "urdu:<cardId>"); a card with no row here has never been reviewed and is
-- treated as due. due_at drives which cards surface each session, interval_days
-- is the current spacing that each grade grows or resets. Composite PK so an
-- upsert on (user_id, card_key) updates the schedule in place.
create table if not exists public.flashcard_reviews (
  user_id uuid not null references auth.users (id) on delete cascade,
  deck text not null,
  card_key text not null,
  interval_days numeric not null default 0,
  due_at timestamptz not null default now(),
  last_grade text,
  reps integer not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, card_key)
);
create index if not exists flashcard_reviews_user_due_idx on public.flashcard_reviews (user_id, deck, due_at);
alter table public.flashcard_reviews enable row level security;

drop policy if exists "flashcard_reviews_select_own" on public.flashcard_reviews;
drop policy if exists "flashcard_reviews_insert_own" on public.flashcard_reviews;
drop policy if exists "flashcard_reviews_update_own" on public.flashcard_reviews;
drop policy if exists "flashcard_reviews_delete_own" on public.flashcard_reviews;
create policy "flashcard_reviews_select_own" on public.flashcard_reviews for select using (auth.uid() = user_id);
create policy "flashcard_reviews_insert_own" on public.flashcard_reviews for insert with check (auth.uid() = user_id);
create policy "flashcard_reviews_update_own" on public.flashcard_reviews for update using (auth.uid() = user_id);
create policy "flashcard_reviews_delete_own" on public.flashcard_reviews for delete using (auth.uid() = user_id);

-- Water intake, logged directly from the app (not sourced from Fitbit/Google
-- Health) — one row per log entry so a day's total is the sum of amount_ml
-- for that civil day. Canonical unit is milliliters (the target is framed in
-- liters); oz is just an input convenience converted client-side before insert.
create table if not exists public.water_logs (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount_ml numeric not null,
  logged_at timestamptz not null default now()
);

-- In case this table was created before the switch from oz to ml: add the new
-- column, backfill it from the old one, then drop the old column. Wrapped in a
-- conditional DO block (rather than a plain UPDATE referencing amount_oz)
-- so this stays safe to re-run even after amount_oz no longer exists.
alter table public.water_logs add column if not exists amount_ml numeric;
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'water_logs' and column_name = 'amount_oz'
  ) then
    update public.water_logs set amount_ml = round((amount_oz * 29.5735296875)::numeric, 1) where amount_ml is null;
    alter table public.water_logs drop column amount_oz;
  end if;
end $$;
alter table public.water_logs alter column amount_ml set not null;

create index if not exists water_logs_user_id_idx on public.water_logs (user_id, logged_at);
alter table public.water_logs enable row level security;

drop policy if exists "water_logs_select_own" on public.water_logs;
drop policy if exists "water_logs_insert_own" on public.water_logs;
drop policy if exists "water_logs_delete_own" on public.water_logs;
create policy "water_logs_select_own" on public.water_logs for select using (auth.uid() = user_id);
create policy "water_logs_insert_own" on public.water_logs for insert with check (auth.uid() = user_id);
create policy "water_logs_delete_own" on public.water_logs for delete using (auth.uid() = user_id);

-- Plaid access tokens for linked bank/credit accounts. RLS is enabled with
-- NO policies below, so the anon/authenticated client can never read or
-- write this table — only server routes using the service-role key (which
-- bypasses RLS) may touch it. Never expose this table to client code.
create table if not exists public.plaid_items (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null,
  access_token text not null,
  institution_name text,
  cursor text,
  created_at timestamptz not null default now()
);

create index if not exists plaid_items_user_id_idx on public.plaid_items (user_id);
alter table public.plaid_items enable row level security;

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
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'vocab_words') then
    alter publication supabase_realtime add table public.vocab_words;
  end if;
end $$;
