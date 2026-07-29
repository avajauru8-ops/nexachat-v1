-- 1. Habilitar a extensão para geração de UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Função genérica para atualizar o timestamp de 'updated_at'
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

---------------------------------------------------------
-- TABELAS E RELACIONAMENTOS
---------------------------------------------------------

-- Workspaces (Inquilinos do SaaS)
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contas do Instagram conectadas
CREATE TABLE instagram_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    ig_user_id TEXT NOT NULL,
    page_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    status TEXT CHECK (status IN ('active', 'disconnected')) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ig_user_id)
);

-- Contatos (Leads capturados)
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    instagram_account_id UUID NOT NULL REFERENCES instagram_accounts(id) ON DELETE CASCADE,
    ig_scoped_id TEXT NOT NULL, -- PSID retornado pela Meta
    name TEXT,
    profile_picture TEXT,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(instagram_account_id, ig_scoped_id)
);

-- Tags para segmentação de leads
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relacionamento N:N entre Contatos e Tags
CREATE TABLE contact_tags (
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (contact_id, tag_id)
);

-- Fluxos de Automação (React Flow)
CREATE TABLE flows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    instagram_account_id UUID NOT NULL REFERENCES instagram_accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT CHECK (status IN ('draft', 'active')) DEFAULT 'draft',
    flow_data JSONB DEFAULT '{}'::jsonb, -- Nós e conexões do React Flow
    triggers JSONB DEFAULT '{}'::jsonb, -- Palavras-chave, respostas a stories, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Biblioteca de Templates Globais (Disponível para todos os usuários)
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    flow_data JSONB NOT NULL,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessões de Conversa (Para controle da janela de 24h e Live Chat)
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('bot_active', 'paused_for_human', 'closed')) DEFAULT 'bot_active',
    last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
    window_expires_at TIMESTAMPTZ, -- last_interaction_at + 24h
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mensagens individuais (Histórico do Chat)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type TEXT CHECK (sender_type IN ('user', 'bot', 'human_agent')) NOT NULL,
    message_type TEXT CHECK (message_type IN ('text', 'image', 'quick_reply', 'story_mention')) NOT NULL,
    content TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

---------------------------------------------------------
-- TRIGGERS DE ATUALIZAÇÃO (UPDATED_AT)
---------------------------------------------------------
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_instagram_accounts_updated_at BEFORE UPDATE ON instagram_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_flows_updated_at BEFORE UPDATE ON flows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

---------------------------------------------------------
-- POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY - RLS)
---------------------------------------------------------

-- Habilitar RLS em todas as tabelas
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Workspace: O usuário só vê o(s) workspace(s) que ele criou
CREATE POLICY "Users can access their own workspaces" ON workspaces 
    FOR ALL USING (auth.uid() = user_id);

-- Instagram Accounts: Acesso baseado no workspace do usuário
CREATE POLICY "Users can access accounts in their workspace" ON instagram_accounts 
    FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

-- Contatos: Acesso baseado no workspace
CREATE POLICY "Users can access contacts in their workspace" ON contacts 
    FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

-- Tags: Acesso baseado no workspace
CREATE POLICY "Users can access tags in their workspace" ON tags 
    FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

-- Contact Tags: Acesso indireto via contatos
CREATE POLICY "Users can access contact tags based on contact" ON contact_tags 
    FOR ALL USING (contact_id IN (
        SELECT id FROM contacts WHERE workspace_id IN (
            SELECT id FROM workspaces WHERE user_id = auth.uid()
        )
    ));

-- Fluxos: Acesso baseado no workspace
CREATE POLICY "Users can access flows in their workspace" ON flows 
    FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

-- Conversas: Acesso baseado no workspace
CREATE POLICY "Users can access conversations in their workspace" ON conversations 
    FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

-- Mensagens: Acesso indireto via conversa
CREATE POLICY "Users can access messages via conversations" ON messages 
    FOR ALL USING (conversation_id IN (
        SELECT id FROM conversations WHERE workspace_id IN (
            SELECT id FROM workspaces WHERE user_id = auth.uid()
        )
    ));

-- Templates: Todos os usuários autenticados podem LER templates públicos, mas não podem alterar
CREATE POLICY "Anyone authenticated can view public templates" ON templates 
    FOR SELECT USING (is_public = true AND auth.role() = 'authenticated');

---------------------------------------------------------
-- CONFIGURAÇÃO DE REALTIME
---------------------------------------------------------
-- Necessário para o Live Chat (Dashboard) ser atualizado instantaneamente quando o webhook injetar dados
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE conversations, messages;
COMMIT;

---------------------------------------------------------
-- TRIGGER AUTOMÁTICO DE CRIAÇÃO DE WORKSPACE NO REGISTRO
---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.workspaces (user_id, name)
  VALUES (new.id, 'Meu Workspace Primário');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dispara a criação do workspace após o registro no Supabase Auth
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
