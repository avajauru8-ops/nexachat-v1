'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Sparkles, Save, Globe, Key, ShieldCheck, RefreshCw, X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface ConnectedAccount {
  id: string;
  ig_user_id: string;
  status: string;
  username: string;
  profile_picture_url: string | null;
  created_at: string;
}

interface Props {
  connectedAccount: ConnectedAccount | null;
}

export default function IntegrationsClient({ connectedAccount: initialConnectedAccount }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [connectedAccount, setConnectedAccount] = useState<ConnectedAccount | null>(initialConnectedAccount);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSavingAi, setIsSavingAi] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);

  // Formulário Conexão Direta por Token
  const [directIgUserId, setDirectIgUserId] = useState('');
  const [directAccessToken, setDirectAccessToken] = useState('');
  const [directUsername, setDirectUsername] = useState('');
  const [isConnectingDirect, setIsConnectingDirect] = useState(false);

  // Estados da Configuração do Agente de IA
  const [aiName, setAiName] = useState('Assistente IA NexaChat');
  const [systemPrompt, setSystemPrompt] = useState('Você é um assistente virtual atencioso e prestativo da nossa empresa no Instagram. Responda de forma clara, educada e sucinta em português.');
  const [llmProvider, setLlmProvider] = useState('openai');
  const [model, setModel] = useState('gpt-4o-mini');
  const [handoffKeywords, setHandoffKeywords] = useState('falar com humano, atendente, suporte humano');
  const [crmWebhookUrl, setCrmWebhookUrl] = useState('');

  // Estados EXCLUSIVOS DE ADMINISTRADOR: Credenciais Oficiais da API Meta Instagram
  const [isAdmin, setIsAdmin] = useState(true); // Exibe por padrão ou valida via Supabase
  const [metaAppId, setMetaAppId] = useState('4360411140866985');
  const [metaAppSecret, setMetaAppSecret] = useState('822e4e7a91e3d8803a85bae1018cb670');
  const [metaVerifyToken, setMetaVerifyToken] = useState('nexachat_webhook_secret_2026');
  const [isSavingMetaAdmin, setIsSavingMetaAdmin] = useState(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);

  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'No_Instagram_Account_Linked') {
      toast.error('Nenhuma conta do Instagram vinculada. Certifique-se de conceder todas as permissões na Meta.');
    } else if (error) {
      toast.error(`Erro na conexão Meta: ${error.replace(/_/g, ' ')}`);
    }
    
    const success = searchParams.get('success');
    if (success === 'true') {
      toast.success('Instagram conectado com sucesso à sua conta!');
    }
  }, [searchParams]);

  // Carregar dados existentes da IA e Credenciais Meta se for Admin
  useEffect(() => {
    supabase.auth.getUser().then(({ data: userRes }) => {
      if (userRes.user) {
        const role = userRes.user.user_metadata?.role || 'Administrador';
        setIsAdmin(role === 'Administrador' || role === 'admin');
      }
    });

    supabase
      .from('ai_agent_configs')
      .select('*')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAiName(data.name || 'Assistente IA NexaChat');
          setSystemPrompt(data.system_prompt || '');
          setLlmProvider(data.llm_provider || 'openai');
          setModel(data.model || 'gpt-4o-mini');
          const keywords = data.handoff_rules?.keywords || ['falar com humano', 'atendente'];
          setHandoffKeywords(Array.isArray(keywords) ? keywords.join(', ') : String(keywords));
        }
      });

    // Buscar credenciais da Meta via API Admin
    fetch('/api/admin/meta-credentials')
      .then(res => res.json())
      .then(data => {
        if (data.meta_app_id) setMetaAppId(data.meta_app_id);
        if (data.meta_app_secret) setMetaAppSecret(data.meta_app_secret);
        if (data.meta_verify_token) setMetaVerifyToken(data.meta_verify_token);
      })
      .catch(console.error);
  }, [supabase]);

  const handleOAuthConnect = (type: 'facebook' | 'instagram' = 'facebook') => {
    window.location.href = `/api/auth/meta?type=${type}`;
  };

  const handleDirectConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directIgUserId.trim() || !directAccessToken.trim()) {
      toast.error('Preencha o ID da Conta Instagram e o Access Token da Meta.');
      return;
    }

    setIsConnectingDirect(true);
    const toastId = toast.loading('Validando credenciais na API Oficial Meta Graph v22.0...');

    try {
      const res = await fetch('/api/instagram/connect-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ig_user_id: directIgUserId,
          access_token: directAccessToken,
          username: directUsername
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`Instagram @${data.account.username} conectado com sucesso!`, { id: toastId });
        setConnectedAccount(data.account);
        setShowTokenModal(false);
        router.refresh();
      } else {
        toast.error(data.error || 'Falha ao conectar com o Access Token informado.', { id: toastId });
      }
    } catch {
      toast.error('Erro de rede ao comunicar com o servidor.', { id: toastId });
    } finally {
      setIsConnectingDirect(false);
    }
  };

  const handleSaveMetaAdminCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingMetaAdmin(true);
    const toastId = toast.loading('Salvando credenciais oficiais da Meta no servidor...');

    try {
      const res = await fetch('/api/admin/meta-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meta_app_id: metaAppId,
          meta_app_secret: metaAppSecret,
          meta_verify_token: metaVerifyToken
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success('Credenciais da Meta salvas e aplicadas com sucesso!', { id: toastId });
      } else {
        toast.error(data.error || 'Falha ao salvar credenciais.', { id: toastId });
      }
    } catch {
      toast.error('Erro ao conectar com o servidor.', { id: toastId });
    } finally {
      setIsSavingMetaAdmin(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar o Instagram? As automações de DM serão pausadas.')) return;

    setIsDisconnecting(true);
    try {
      const res = await fetch('/api/instagram/disconnect', { method: 'DELETE' });
      if (res.ok) {
        toast.success('Instagram desconectado com sucesso!');
        setConnectedAccount(null);
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao desconectar');
      }
    } catch {
      toast.error('Erro ao desconectar. Tente novamente.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSaveAiConfig = async () => {
    setIsSavingAi(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) {
        toast.error('Sessão expirada. Faça login novamente.');
        return;
      }

      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('user_id', userRes.user.id)
        .single();

      if (!workspace) {
        toast.error('Workspace não encontrado');
        return;
      }

      const keywordsArray = handoffKeywords.split(',').map(k => k.trim()).filter(Boolean);

      const { data: existing } = await supabase
        .from('ai_agent_configs')
        .select('id')
        .eq('workspace_id', workspace.id)
        .maybeSingle();

      if (existing) {
        await supabase.from('ai_agent_configs').update({
          name: aiName,
          system_prompt: systemPrompt,
          llm_provider: llmProvider,
          model: model,
          handoff_rules: { keywords: keywordsArray, max_turns: 6 }
        }).eq('id', existing.id);
      } else {
        await supabase.from('ai_agent_configs').insert({
          workspace_id: workspace.id,
          name: aiName,
          system_prompt: systemPrompt,
          llm_provider: llmProvider,
          model: model,
          handoff_rules: { keywords: keywordsArray, max_turns: 6 }
        });
      }

      toast.success('Configurações do Agente de IA salvas!');
    } catch (err) {
      console.error(err);
      toast.error('Falha ao salvar configurações de IA');
    } finally {
      setIsSavingAi(false);
    }
  };

  const [serverWebhookUrl, setServerWebhookUrl] = useState('https://nexachat-v1.vercel.app/api/webhooks/instagram');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Update server webhook URL only if not already set to avoid unnecessary re-renders
      setServerWebhookUrl(prev => {
        const newUrl = `${window.location.origin}/api/webhooks/instagram`;
        return prev === newUrl ? prev : newUrl;
      });
    }
  }, []);

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(serverWebhookUrl);
    setCopiedWebhookUrl(true);
    toast.success('URL de Webhook copiada!');
    setTimeout(() => setCopiedWebhookUrl(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Integrações & IA</h1>
        <p className="text-gray-600 mt-1">Conecte sua conta do Instagram Direct, configure o Agente de IA e sincronize seus CRMs.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card Conexão Instagram Direct */}
        <div className="glass-panel p-6 rounded-3xl border border-white/60 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm flex-shrink-0 border border-indigo-200/50 backdrop-blur-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Instagram Direct</h2>
                <p className="text-xs text-gray-500">API Oficial Meta Graph v22.0</p>
              </div>
            </div>

            {connectedAccount ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-emerald-800">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span className="text-xs font-bold">Conectado & Ativo no Meta Graph</span>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                    @{connectedAccount.username?.substring(0, 2).toUpperCase() || 'IG'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 text-sm truncate">
                      @{connectedAccount.username || connectedAccount.ig_user_id}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">ID: {connectedAccount.ig_user_id}</p>
                  </div>
                </div>

                <div className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900">
                    <ShieldCheck className="w-4 h-4 text-blue-600" /> Webhook Ativo
                  </div>
                  <p className="text-[11px] text-blue-800">Pronto para receber DMs, responder Stories e executar fluxos em tempo real.</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 leading-relaxed mb-6">
                Automatize respostas no Direct, engaje nos Stories e transforme comentários em conversas privadas usando a API oficial da Meta.
              </p>
            )}
          </div>

          <div className="pt-6 space-y-2">
            {connectedAccount ? (
              <>
                <button
                  onClick={() => window.location.href = `/api/auth/meta?type=instagram&t=${Date.now()}`}
                  className="w-full py-2.5 text-blue-600 border border-blue-200 bg-blue-50 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reconectar via Instagram
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="w-full py-2.5 text-red-600 border border-red-200 bg-red-50 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  {isDisconnecting ? 'Desconectando...' : '🔌 Desconectar Instagram'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowTokenModal(true)}
                  className="w-full py-3 text-white rounded-xl text-xs font-bold hover:opacity-95 shadow-md transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]"
                >
                  <Key className="w-4 h-4" /> Conectar Conta Real via Token da Meta
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => window.location.href = `/api/auth/meta?type=instagram&t=${Date.now()}`}
                    className="w-full py-2 border border-gray-300 hover:border-gray-400 text-gray-700 bg-gray-50 hover:bg-white rounded-xl text-[11px] font-semibold transition-colors text-center"
                  >
                    Meta OAuth (Instagram)
                  </button>
                  <button
                    onClick={() => window.location.href = '/api/auth/meta?mock=true'}
                    className="w-full py-2 border border-purple-200 hover:border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl text-[11px] font-semibold transition-colors text-center"
                  >
                    Modo Teste Rápido
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Configurações do Agente de IA */}
        <div className="glass-panel p-6 rounded-3xl border border-white/60 shadow-lg flex flex-col lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Agente de IA (LLM & RAG)</h2>
              <p className="text-xs text-gray-500">Configure as diretrizes do assistente para responder dúvidas na DM</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nome do Agente</label>
              <input
                type="text"
                value={aiName}
                onChange={e => setAiName(e.target.value)}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Provedor de LLM</label>
                <select
                  value={llmProvider}
                  onChange={e => setLlmProvider(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:border-purple-500 bg-white"
                >
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Google Gemini</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Modelo</label>
                <select
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:border-purple-500 bg-white"
                >
                  <option value="gpt-4o-mini">gpt-4o-mini (Rápido e econômico)</option>
                  <option value="gpt-4o">gpt-4o (Avançado)</option>
                  <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Prompt de Sistema (Instruções da IA)</label>
              <textarea
                rows={3}
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                placeholder="Ex: Você é um assistente da empresa X..."
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Palavras-chave de Handoff Humano (separadas por vírgula)</label>
              <input
                type="text"
                value={handoffKeywords}
                onChange={e => setHandoffKeywords(e.target.value)}
                placeholder="falar com humano, atendente, suporte"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleSaveAiConfig}
                disabled={isSavingAi}
                className="w-full sm:w-auto px-6 py-2.5 bg-instagram-gradient hover:opacity-90 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-pink-500/20 flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.02]"
              >
                <Save className="w-4 h-4" />
                {isSavingAi ? 'Salvando...' : 'Salvar Configurações de IA'}
              </button>
            </div>
          </div>
        </div>
      </div>



      {/* Seção CRM Integration Webhook */}
      {isAdmin && (
      <div className="glass-panel p-6 rounded-3xl border border-white/60 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Integração CRM / Webhooks de Saída</h2>
            <p className="text-xs text-gray-500">Envie eventos de leads capturados no Instagram para HubSpot, RD Station ou Webhook Genérico</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <input
            type="url"
            value={crmWebhookUrl}
            onChange={e => setCrmWebhookUrl(e.target.value)}
            placeholder="https://sua-api.com/webhook-lead"
            className="flex-1 px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => toast.success('Webhook de CRM configurado!')}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
          >
            Salvar Webhook
          </button>
        </div>
      </div>
      )}

      {/* MODAL DE CONEXÃO DIRETA VIA TOKEN / CHAVE DA META */}
      {showTokenModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl max-w-lg w-full p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setShowTokenModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Conectar por Token da Meta Graph API</h3>
                <p className="text-xs text-gray-500">Conecte diretamente sua conta do Instagram para automação de DMs</p>
              </div>
            </div>

            <form onSubmit={handleDirectConnect} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  ID do Usuário Instagram (ig_user_id) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={directIgUserId}
                  onChange={e => setDirectIgUserId(e.target.value)}
                  placeholder="Ex: 17841400000000000"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Meta Access Token (Page or User Token) <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={directAccessToken}
                  onChange={e => setDirectAccessToken(e.target.value)}
                  placeholder="Cole aqui seu EAAG... ou EAA..."
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Username do Instagram (Opcional)
                </label>
                <input
                  type="text"
                  value={directUsername}
                  onChange={e => setDirectUsername(e.target.value)}
                  placeholder="Ex: meu_perfil_oficial"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-[11px] text-purple-900 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Sincronização em Tempo Real
                </p>
                <p>O NexaChat irá registrar os webhooks oficiais da Meta e validar o token com permissão de envio de DMs.</p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowTokenModal(false)}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isConnectingDirect}
                  className="px-5 py-2 bg-instagram-gradient hover:opacity-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isConnectingDirect ? 'Validando...' : 'Salvar e Conectar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
