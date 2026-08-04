-- =========================================================
-- NexaChat — Sprint UI CRM v2 (Painel CRM no Inbox)
-- Rode este script no Editor SQL do seu Supabase Dashboard
-- =========================================================

-- 1. Campos de contato usados pelo painel de perfil (a rota
--    /api/contacts/update-profile já grava neles).
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Etapa do funil de vendas (pipeline) por conversa.
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'novo';
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_pipeline_stage_check;
ALTER TABLE conversations ADD CONSTRAINT conversations_pipeline_stage_check
  CHECK (pipeline_stage IN ('novo', 'em_atendimento', 'em_negociacao', 'fechado', 'perdido'));

-- 3. Metadados de contexto (post/story) por mensagem para
--    renderizar a citação (quote) no chat: media_id, post_url,
--    post_text (legenda), thumbnail_url.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 4. Garantir que o dono de cada workspace existente seja membro
--    (necessário para o seletor de atribuição de agente).
INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT w.id, w.user_id, 'owner'
FROM workspaces w
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- 5. Trigger de novo usuário: além do workspace, criar o membro owner.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.workspaces (user_id, name)
  VALUES (new.id, 'Meu Workspace Primário');

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  SELECT w.id, new.id, 'owner'
  FROM public.workspaces w
  WHERE w.user_id = new.id
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
