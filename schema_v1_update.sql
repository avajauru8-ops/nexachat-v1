-- =========================================================
-- NexaChat v1.0 — Migração & Atualização do Schema Postgres
-- =========================================================

-- 1. Extensão para Busca Semântica (RAG)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Atualizações em Workspaces
ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';

-- 3. Tabela de Membros do Workspace (Equipe / Atendentes)
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- owner | admin | agent
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id)
);

-- 4. Atualizações em Instagram Accounts
ALTER TABLE instagram_accounts 
ADD COLUMN IF NOT EXISTS ig_username TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS webhook_subscribed BOOLEAN DEFAULT false;

-- 5. Atualizações em Fluxos de Automação
ALTER TABLE flows 
ADD COLUMN IF NOT EXISTS trigger_type TEXT NOT NULL DEFAULT 'dm_keyword',
ADD COLUMN IF NOT EXISTS trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS graph_json JSONB,
ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

-- Preenche graph_json a partir de flow_data existente se necessário
UPDATE flows SET graph_json = flow_data WHERE graph_json IS NULL AND flow_data IS NOT NULL;

-- Histórico de Versões do Fluxo (Rollback & Diff)
CREATE TABLE IF NOT EXISTS flow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID REFERENCES flows(id) ON DELETE CASCADE,
  version INT NOT NULL,
  graph_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Log de Eventos Brutos do Webhook (Auditoria & Resposta rápida da Meta)
CREATE TABLE IF NOT EXISTS events_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  raw_payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Atualizações em Contatos e Tags
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMPTZ;

ALTER TABLE tags 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3B82F6';

-- 8. Atualizações em Conversas (Controle de Estado do Robô / IA / Humano)
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_status_check;
ALTER TABLE conversations ADD CONSTRAINT conversations_status_check CHECK (status IN ('bot', 'ai', 'human', 'closed', 'bot_active', 'paused_for_human'));

ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS assigned_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS active_flow_id UUID REFERENCES flows(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS flow_cursor JSONB,
ADD COLUMN IF NOT EXISTS unread_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT NOW();

-- Garantir que não haja conversas duplicadas (1 por lead por workspace)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_workspace_contact_conversation') THEN
        -- Remove duplicatas antes de adicionar a restrição (mantém a mais recente)
        DELETE FROM conversations a USING conversations b WHERE a.workspace_id = b.workspace_id AND a.contact_id = b.contact_id AND a.created_at < b.created_at;
        ALTER TABLE conversations ADD CONSTRAINT unique_workspace_contact_conversation UNIQUE (workspace_id, contact_id);
    END IF;
END $$;

-- 9. Atualizações em Mensagens
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'inbound', -- inbound | outbound
ADD COLUMN IF NOT EXISTS meta_message_id TEXT,
ADD COLUMN IF NOT EXISTS media_url TEXT;

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_sender_type_check CHECK (sender_type IN ('user', 'bot', 'human_agent', 'ai'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_meta_id ON messages (meta_message_id) WHERE meta_message_id IS NOT NULL;

-- 10. Agente de IA & Base de Conhecimento RAG
CREATE TABLE IF NOT EXISTS ai_agent_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  llm_provider TEXT NOT NULL DEFAULT 'openai', -- openai | gemini
  model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  handoff_rules JSONB NOT NULL DEFAULT '{"keywords": ["falar com humano"], "max_turns": 6}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_base_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  ai_agent_config_id UUID REFERENCES ai_agent_configs(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Integrações CRM
CREATE TABLE IF NOT EXISTS crm_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- hubspot | rdstation | activecampaign | webhook_generic
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_integration_id UUID REFERENCES crm_integrations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL, -- success | failed
  response_snippet TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Habilitar RLS em Novas Tabelas
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_sync_log ENABLE ROW LEVEL SECURITY;

-- Políticas RLS Básicas
CREATE POLICY "Users can access their workspace members" ON workspace_members 
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can access flow versions" ON flow_versions 
  FOR ALL USING (flow_id IN (SELECT id FROM flows WHERE workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())));

CREATE POLICY "Users can access events log" ON events_log 
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can access AI agent configs" ON ai_agent_configs 
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can access knowledge base" ON knowledge_base_documents 
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can access CRM integrations" ON crm_integrations 
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Users can access CRM logs" ON crm_sync_log 
  FOR ALL USING (crm_integration_id IN (SELECT id FROM crm_integrations WHERE workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())));
