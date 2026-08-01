-- =========================================================
-- NexaChat v1.0 — Correção de Schema (Notificações e Duplicatas)
-- Rode este script no Editor SQL do seu Supabase Dashboard
-- =========================================================

-- 1. Adicionar o contador de mensagens não lidas
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS unread_count INT DEFAULT 0;

-- 2. Garantir que não haja conversas duplicadas (1 por lead por workspace)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_workspace_contact_conversation') THEN
        -- Remove duplicatas históricas antes de adicionar a restrição (mantém apenas a mais recente)
        DELETE FROM conversations a USING conversations b WHERE a.workspace_id = b.workspace_id AND a.contact_id = b.contact_id AND a.created_at < b.created_at;
        
        ALTER TABLE conversations ADD CONSTRAINT unique_workspace_contact_conversation UNIQUE (workspace_id, contact_id);
    END IF;
END $$;
