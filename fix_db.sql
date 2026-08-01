-- =========================================================
-- NexaChat v1.0 — Correção de Schema (Mensagens e Contatos)
-- Rode este script no Editor SQL do seu Supabase Dashboard
-- =========================================================

-- 1. Adicionar coluna media_url na tabela de mensagens
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url TEXT;

-- 2. Atualizar a restrição para permitir que a IA responda
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_sender_type_check CHECK (sender_type IN ('user', 'bot', 'human_agent', 'ai'));
