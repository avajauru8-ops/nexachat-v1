-- =========================================================
-- NexaChat — Sprint UI Pastas do Inbox (Favorites)
-- Rode este script no Editor SQL do seu Supabase Dashboard
-- =========================================================

-- Coluna de favoritos nas conversas (folder "Favorites" da Inbox)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
