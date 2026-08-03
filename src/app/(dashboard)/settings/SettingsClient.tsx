'use client';

import { useState, useEffect, useRef } from 'react';
import { Settings, User, Bell, Shield, Key, CreditCard, Save, Check, Copy, Eye, EyeOff, Loader2, Users, UserPlus, ShieldCheck, Lock, X, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createClient } from '@/utils/supabase/client';

interface WorkspaceData {
  id: string;
  name: string;
}

interface Props {
  initialUser: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    language: string;
    timezone: string;
    avatarUrl?: string;
  } | null;
  initialWorkspace: WorkspaceData | null;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Administrador' | 'Gerente' | 'Atendente (Usuário)';
  status: 'active' | 'invited';
}

function compressImage(file: File, maxWidth = 128, maxHeight = 128, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function SettingsClient({ initialUser, initialWorkspace }: Props) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados Perfil
  const [fullName, setFullName] = useState(initialUser?.fullName || 'Eber');
  const [role, setRole] = useState(initialUser?.role || 'Administrador');
  const [avatarUrl, setAvatarUrl] = useState(initialUser?.avatarUrl || '');
  const [email] = useState(initialUser?.email || 'admin@nexachat.com');
  const [language, setLanguage] = useState(initialUser?.language || 'pt-BR');
  const [timezone, setTimezone] = useState(initialUser?.timezone || 'America/Sao_Paulo');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 10MB.');
      return;
    }

    try {
      const compressedDataUrl = await compressImage(file, 128, 128, 0.85);
      setAvatarUrl(compressedDataUrl);
      toast.success('Foto redimensionada e otimizada! Clique em "Salvar Alterações".');
    } catch {
      toast.error('Erro ao processar imagem.');
    }
  };

  // Estados Workspace
  const [workspaceName, setWorkspaceName] = useState(initialWorkspace?.name || 'Meu Workspace Primário');
  const [businessSegment, setBusinessSegment] = useState('Agência de Marketing');

  // Estados Equipe & Níveis de Acesso (RBAC)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    {
      id: 'usr_1',
      name: initialUser?.fullName || 'Eber',
      email: initialUser?.email || 'admin@nexachat.com',
      role: (initialUser?.role as TeamMember['role']) || 'Administrador',
      status: 'active'
    },
    {
      id: 'usr_2',
      name: 'Maria Atendimentos',
      email: 'maria@nexachat.com',
      role: 'Atendente (Usuário)',
      status: 'active'
    },
    {
      id: 'usr_3',
      name: 'Carlos Gerente',
      email: 'carlos@nexachat.com',
      role: 'Gerente',
      status: 'active'
    }
  ]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<TeamMember['role']>('Atendente (Usuário)');

  // Estados Notificações
  const [notifyOnHandoff, setNotifyOnHandoff] = useState(true);
  const [notifyDailyReport, setNotifyDailyReport] = useState(true);
  const [notifyNewLead, setNotifyNewLead] = useState(false);

  // Estados Segurança
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Estados API Keys
  const [apiKey, setApiKey] = useState('nexachat_live_sk_78192a839f1092834');
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const tabs = [
    { id: 'profile', label: 'Meu Perfil', icon: User },
    { id: 'workspace', label: 'Workspace', icon: Settings },
    { id: 'billing', label: 'Assinatura', icon: CreditCard },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'security', label: 'Segurança', icon: Shield },
  ];

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const meta = data.user.user_metadata || {};
        if (meta.full_name) setFullName(meta.full_name);
        if (meta.role) setRole(meta.role);
        if (meta.language) setLanguage(meta.language);
        if (meta.timezone) setTimezone(meta.timezone);
        if (meta.notify_handoff !== undefined) setNotifyOnHandoff(meta.notify_handoff);
        if (meta.notify_daily !== undefined) setNotifyDailyReport(meta.notify_daily);
        if (meta.notify_lead !== undefined) setNotifyNewLead(meta.notify_lead);
        if (meta.api_key) setApiKey(meta.api_key);
      }
    });
  }, [supabase]);

  // Salvar Alterações Globais
  const handleSaveAll = async () => {
    setIsSaving(true);
    const toastId = toast.loading('Salvando alterações no banco de dados...');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Sessão expirada. Faça login novamente.', { id: toastId });
        setIsSaving(false);
        return;
      }

      // Atualizar Metadados no Supabase Auth
      const { error: userErr } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          avatar_url: avatarUrl,
          picture: avatarUrl,
          role: role,
          language: language,
          timezone: timezone,
          notify_handoff: notifyOnHandoff,
          notify_daily: notifyDailyReport,
          notify_lead: notifyNewLead,
          business_segment: businessSegment,
          api_key: apiKey
        }
      });

      if (userErr) throw new Error('Erro ao atualizar perfil: ' + userErr.message);

      // Atualizar Workspace
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (workspace) {
        await supabase
          .from('workspaces')
          .update({ name: workspaceName })
          .eq('id', workspace.id);
      }

      toast.success('Configurações salvas e atualizadas com sucesso!', { id: toastId });
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Falha ao salvar no banco de dados', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  // Alterar Nível de Acesso de um Membro
  const handleChangeMemberRole = (memberId: string, newRole: TeamMember['role']) => {
    const updated = teamMembers.map(m => m.id === memberId ? { ...m, role: newRole } : m);
    setTeamMembers(updated);
    toast.success(`Nível de acesso alterado para "${newRole}"! Lembre-se de salvar.`);
  };

  // Convidar Novo Membro
  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim() || !newMemberName.trim()) {
      toast.error('Preencha nome e e-mail do novo membro.');
      return;
    }

    const newMember: TeamMember = {
      id: Math.random().toString(),
      name: newMemberName.trim(),
      email: newMemberEmail.trim(),
      role: newMemberRole,
      status: 'invited'
    };

    setTeamMembers([...teamMembers, newMember]);
    setShowInviteModal(false);
    setNewMemberEmail('');
    setNewMemberName('');
    toast.success(`Convite enviado para ${newMember.email} com nível "${newMemberRole}"!`);
  };

  // Função para Alterar Senha
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    setIsChangingPassword(true);
    const toastId = toast.loading('Atualizando senha de acesso...');

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success('Senha alterada com sucesso!', { id: toastId });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      toast.error('Erro ao alterar senha: ' + (err instanceof Error ? err.message : String(err)), { id: toastId });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleGenerateNewApiKey = () => {
    const newKey = 'nexachat_live_sk_' + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    setApiKey(newKey);
    toast.success('Nova Chave de API gerada! Lembre-se de salvar as alterações.');
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    toast.success('Chave de API copiada!');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Configurações</h1>
          <p className="text-sm text-gray-600 mt-1">Gerencie preferências da conta, níveis de acesso e equipe.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-5 py-2.5 text-xs bg-instagram-gradient hover:opacity-90 rounded-xl text-white font-bold transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-pink-500/20 hover:scale-[1.02]"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Salvando no Banco...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <nav className="space-y-1 bg-white/40 backdrop-blur-sm p-2 border border-white/50 rounded-3xl shadow-sm">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold rounded-2xl transition-all ${
                    isActive
                      ? 'bg-white/80 text-pink-600 font-bold shadow-sm border border-white'
                      : 'text-gray-600 hover:bg-white/60 hover:text-gray-900 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-pink-600' : 'text-gray-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Área de Conteúdo das Abas */}
        <div className="flex-1 space-y-6">
          
          {/* ABA: MEU PERFIL */}
          {activeTab === 'profile' && (
            <>
              <div className="glass-panel rounded-3xl border-white/60 shadow-lg overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-900">Perfil Público</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Como você aparecerá para a sua equipe no NexaChat.</p>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="relative group shrink-0">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={avatarUrl} 
                          alt="Avatar Preview" 
                          className="w-16 h-16 rounded-full object-cover shadow-md border-2 border-indigo-200" 
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
                          {fullName ? fullName.substring(0, 2).toUpperCase() : 'US'}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Fazer Upload de Foto"
                      >
                        <Upload className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 text-xs bg-instagram-gradient text-white rounded-xl font-bold transition-all shadow-lg shadow-pink-500/20 hover:scale-[1.02] flex items-center gap-1.5 cursor-pointer border-none"
                        >
                          <Upload className="w-3.5 h-3.5 text-white" /> Fazer Upload de Imagem
                        </button>

                        {avatarUrl && (
                          <button 
                            type="button"
                            onClick={() => setAvatarUrl('')}
                            className="px-3 py-2 text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl font-semibold transition-colors cursor-pointer"
                          >
                            Remover Foto
                          </button>
                        )}
                      </div>

                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/png, image/jpeg, image/webp, image/gif"
                        className="hidden"
                      />

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700">Ou informe a URL da Foto (Avatar)</label>
                        <input
                          type="url"
                          value={avatarUrl}
                          onChange={(e) => setAvatarUrl(e.target.value)}
                          placeholder="https://exemplo.com/sua-foto.jpg"
                          className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-mono text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        />
                        <p className="text-[11px] text-gray-400">Selecione um arquivo de imagem (PNG, JPG, WEBP) no seu computador ou insira uma URL.</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">Nome Completo</label>
                      <input 
                        type="text" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">Cargo / Função</label>
                      <input 
                        type="text" 
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="Ex: Administrador"
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold text-gray-700">Email de Contato</label>
                      <input 
                        type="email" 
                        value={email}
                        readOnly
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-500 outline-none cursor-not-allowed"
                      />
                      <p className="text-[11px] text-gray-400 mt-1">Seu email de acesso é vinculado ao seu provedor de login.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-panel rounded-3xl border-white/60 shadow-lg overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-900">Preferências Regionais</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Configure o idioma e fuso horário padrão das automações.</p>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">Idioma</label>
                      <select 
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer"
                      >
                        <option value="pt-BR">Português (Brasil)</option>
                        <option value="en-US">English (US)</option>
                        <option value="es-ES">Español</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">Fuso Horário</label>
                      <select 
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer"
                      >
                        {Intl.supportedValuesOf('timeZone').map(tz => (
                          <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ABA: WORKSPACE */}
          {activeTab === 'workspace' && (
            <div className="glass-panel rounded-3xl border-white/60 shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-base font-bold text-gray-900">Dados do Workspace</h2>
                <p className="text-xs text-gray-500 mt-0.5">Gerencie as informações gerais e segmento da organização.</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Nome do Workspace</label>
                  <input 
                    type="text" 
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Segmento de Atuação</label>
                  <select 
                    value={businessSegment}
                    onChange={(e) => setBusinessSegment(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer"
                  >
                    <option value="Agência de Marketing">Agência de Marketing</option>
                    <option value="E-commerce">E-commerce</option>
                    <option value="Infoprodutos">Infoprodutos & Lançamentos</option>
                    <option value="Vendas Diretas">Vendas Diretas / Serviços</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-xs text-gray-500">Deseja remover este workspace?</p>
                  <button 
                    onClick={() => toast.error('Workspaces com automações ativas não podem ser excluídos.')}
                    className="px-4 py-2 text-xs text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 rounded-xl font-bold transition-colors"
                  >
                    Excluir Workspace
                  </button>
                </div>
              </div>
            </div>
          )}



          {/* ABA: ASSINATURA */}
          {activeTab === 'billing' && (
            <div className="glass-panel rounded-3xl border-white/60 shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-base font-bold text-gray-900">Plano e Assinatura</h2>
                <p className="text-xs text-gray-500 mt-0.5">Gerencie seu plano, cotas de DMs e faturas recentes.</p>
              </div>
              <div className="p-6">
                <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 text-white mb-6 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-xs">Plano Ativo</span>
                    <span className="text-xs font-medium text-blue-100">Renova automaticamente</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-1">NexaChat Pro Unlimited</h3>
                  <p className="text-blue-100 text-xs mb-4">Acesso ilimitado a fluxos visuais, Agente de IA e Meta Graph API Direct.</p>
                  <div className="flex items-center justify-between pt-2 border-t border-white/20">
                    <span className="text-2xl font-extrabold">R$ 97<span className="text-sm font-normal text-blue-100">/mês</span></span>
                    <button 
                      onClick={() => toast.success('Você já possui a assinatura Pro ativa!')}
                      className="px-4 py-2 bg-white text-blue-700 rounded-xl text-xs font-bold shadow-sm hover:bg-blue-50 transition-colors"
                    >
                      Gerenciar Assinatura
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider">Histórico de Faturas</h4>
                  <div className="border border-gray-200 rounded-xl p-4 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-gray-900">Fatura #2026-07</p>
                      <p className="text-gray-400">Pago em 15 de Julho de 2026</p>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full text-[11px]">Pago (R$ 97,00)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA: NOTIFICAÇÕES */}
          {activeTab === 'notifications' && (
            <div className="glass-panel rounded-3xl border-white/60 shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-base font-bold text-gray-900">Preferências de Notificações</h2>
                <p className="text-xs text-gray-500 mt-0.5">Escolha quando deseja receber alertas e relatórios por e-mail.</p>
              </div>
              <div className="p-6 space-y-5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={notifyOnHandoff}
                    onChange={(e) => setNotifyOnHandoff(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-bold text-gray-900">Solicitação de Atendimento Humano</p>
                    <p className="text-xs text-gray-500">Enviar e-mail imediato quando um cliente digitar palavras-chave como "atendente" ou "falar com humano".</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={notifyDailyReport}
                    onChange={(e) => setNotifyDailyReport(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-bold text-gray-900">Relatório Diário de Atendimentos</p>
                    <p className="text-xs text-gray-500">Receber resumo diário das interações concluídas e taxa de conversão dos fluxos.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={notifyNewLead}
                    onChange={(e) => setNotifyNewLead(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-bold text-gray-900">Alerta de Novo Lead Capturado</p>
                    <p className="text-xs text-gray-500">Notificar a cada lead que responder aos formulários ou botões dos fluxos.</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* ABA: SEGURANÇA */}
          {activeTab === 'security' && (
            <div className="glass-panel rounded-3xl border-white/60 shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-base font-bold text-gray-900">Segurança da Conta</h2>
                <p className="text-xs text-gray-500 mt-0.5">Altere sua senha de acesso e configure credenciais de login.</p>
              </div>
              
              <form onSubmit={handleChangePassword} className="p-6 space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nova Senha</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Confirmar Nova Senha</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50"
                >
                  {isChangingPassword ? 'Atualizando...' : 'Atualizar Senha'}
                </button>
              </form>
            </div>
          )}



        </div>
      </div>

      {/* MODAL PARA CONVIDAR MEMBRO */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setShowInviteModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Convidar Membro para Equipe</h3>
                <p className="text-xs text-gray-500">Envie um convite e atribua um nível de permissão</p>
              </div>
            </div>

            <form onSubmit={handleInviteMember} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome do Membro</label>
                <input
                  type="text"
                  required
                  value={newMemberName}
                  onChange={e => setNewMemberName(e.target.value)}
                  placeholder="Ex: Ana Souza"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={newMemberEmail}
                  onChange={e => setNewMemberEmail(e.target.value)}
                  placeholder="ana@suaempresa.com"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nível de Permissão (Role)</label>
                <select
                  value={newMemberRole}
                  onChange={e => setNewMemberRole(e.target.value as TeamMember['role'])}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-indigo-500 bg-white cursor-pointer"
                >
                  <option value="Administrador">👑 Administrador (Acesso Total)</option>
                  <option value="Gerente">💼 Gerente (Edição de Fluxos & IA)</option>
                  <option value="Atendente (Usuário)">🎧 Atendente (Apenas Inbox DM)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  Enviar Convite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
