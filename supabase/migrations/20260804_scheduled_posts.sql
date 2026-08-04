-- ============================================================
-- Agendamento de Posts & Reels (NexaChat)
-- Execute este script uma única vez no Supabase: SQL Editor > Run
-- ============================================================

create table if not exists public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  instagram_account_id uuid references public.instagram_accounts(id) on delete cascade,
  media_type text not null default 'POST' check (media_type in ('POST', 'REELS')),
  caption text,
  media_url text,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'publishing', 'published', 'failed')),
  error text,
  published_media_id text,
  published_permalink text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists scheduled_posts_due_idx
  on public.scheduled_posts (status, scheduled_at);

alter table public.scheduled_posts enable row level security;

drop policy if exists "scheduled_posts_all" on public.scheduled_posts;
create policy "scheduled_posts_all"
  on public.scheduled_posts
  for all
  using (true)
  with check (true);
