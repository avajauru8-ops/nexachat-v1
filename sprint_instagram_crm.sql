-- =========================================================
-- NexaChat — Sprint Instagram CRM v1
-- Rode este script no Editor SQL do seu Supabase Dashboard
-- =========================================================

-- 1. Ampliar message_type para suportar vídeo, áudio, share, story_reply e comentários.
--    O CHECK antigo só permitia ('text','image','quick_reply','story_mention') e
--    qualquer DM com anexo (vídeo/áudio/share) ou reply de story quebrava o INSERT.
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_message_type_check
  CHECK (message_type IN ('text', 'image', 'video', 'audio', 'share', 'story_mention', 'story_reply', 'quick_reply', 'comment'));

-- 2. Coluna username em contacts (já usada pelo código em fetch-profile e update-profile).
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS username TEXT;

-- 3. Canal de origem da conversa (dm | comment | story) para a UI distinguir
--    Comentários de DMs e habilitar a resposta cruzada (comentário -> DM).
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'dm';
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_channel_check;
ALTER TABLE conversations ADD CONSTRAINT conversations_channel_check
  CHECK (channel IN ('dm', 'comment', 'story'));
