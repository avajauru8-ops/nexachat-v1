-- Adiciona coluna para anexos de mídia (fotos, vídeos, áudios, etc)
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Adiciona coluna para contagem de mensagens não lidas no sininho
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;
