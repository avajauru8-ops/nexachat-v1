-- ============================================================
-- Correções do Agendamento (retry automático + horário)
-- Execute este script uma única vez no Supabase: SQL Editor > Run
-- (seguro rodar mais de uma vez)
-- ============================================================

alter table public.scheduled_posts
  add column if not exists attempts integer not null default 0;

alter table public.scheduled_posts
  add column if not exists last_error text;

alter table public.scheduled_posts
  add column if not exists last_error_at timestamptz;

alter table public.scheduled_posts
  add column if not exists updated_at timestamptz not null default now();
