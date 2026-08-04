'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, Copy, Settings, Users, Database, Sparkles, Plus, Trash2, Save, CreditCard, Bell, Send, LayoutDashboard, ShieldAlert, UserPlus, RefreshCw, ShieldCheck, Cpu, Pencil, EyeOff, Eye, Globe, CheckCircle, X, Menu, Power, Wrench } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { DEFAULT_DASHBOARD_MENUS, notifyMenusChanged, type DashboardMenu } from '@/utils/dashboardMenus';

interface UserItem {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  created_at: string;
}

interface PlanItem {
  id: string;
  name: string;
  price: number;
  message_limit: number;
  features: string[];
  is_active: boolean;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  target_user: string;
  type: string;
  created_at: string;
}

interface Props {
  currentUser: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export default function AdminDashboardClient({ currentUser }: Props) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'meta' | 'ai' | 'plans' | 'notifications' | 'menus'>(() => {
    const tabParam = searchParams.get('tab');
    return (tabParam as any) || 'dashboard';
  });

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('Atendente');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState('');
  const [editingUserName, setEditingUserName] = useState('');
  const [editingUserEmail, setEditingUserEmail] = useState('');
  const [editingUserRole, setEditingUserRole] = useState('Usuário');
  const [editingUserPassword, setEditingUserPassword] = useState('');
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  const [confirmDeleteUserItem, setConfirmDeleteUserItem] = useState<UserItem | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const [metaAppId, setMetaAppId] = useState('');
  const [metaAppSecret, setMetaAppSecret] = useState('');
  const [metaVerifyToken, setMetaVerifyToken] = useState('');
  const [showMetaSecret, setShowMetaSecret] = useState(false);
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);

  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [defaultProvider, setDefaultProvider] = useState('gemini');
  const [defaultModel, setDefaultModel] = useState('gemini-1.5-flash');
  const [globalSystemPrompt, setGlobalSystemPrompt] = useState('Você é um assistente virtual atencioso.');
  const [isSavingAi, setIsSavingAi] = useState(false);
  const [isLoadingAi, setIsLoadingAi] = useState(true);

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState('97');
  const [planLimit, setPlanLimit] = useState('50000');
  const [planFeatures, setPlanFeatures] = useState('');
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);

  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState('');
  const [editingPlanName, setEditingPlanName] = useState('');
  const [editingPlanPrice, setEditingPlanPrice] = useState('0');
  const [editingPlanLimit, setEditingPlanLimit] = useState('1000');
  const [editingPlanFeatures, setEditingPlanFeatures] = useState('');
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifTarget, setNotifTarget] = useState('Todos');
  const [notifType, setNotifType] = useState('info');
  const [isSendingNotif, setIsSendingNotif] = useState(false);

  const [isClient, setIsClient] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');

  const [menus, setMenus] = useState<DashboardMenu[]>(DEFAULT_DASHBOARD_MENUS);
  const [isLoadingMenus, setIsLoadingMenus] = useState(true);
  const [isSavingMenus, setIsSavingMenus] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setWebhookUrl(`${window.location.origin}/api/webhooks/instagram`);
    fetchUsers();
    fetchMetaCredentials();
    fetchAiCredentials();
    fetchPlans();
    fetchNotifications();
    fetchMenus();
  }, []);

  const handleCopy = (text: string, fieldId: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    toast.success(`${label} copiado!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const fetchUsers = () => {
    fetch('/api/admin/users')
      .then(res => res.json())
      .then(data => { if (data.users) setUsers(data.users); })
      .finally(() => setIsLoadingUsers(false));
  };

  const fetchMetaCredentials = () => {
    fetch('/api/admin/meta-credentials')
      .then(res => res.json())
      .then(data => {
        setMetaAppId(data.meta_app_id || '');
        setMetaAppSecret(data.meta_app_secret || '');
        setMetaVerifyToken(data.meta_verify_token || '');
      });
  };

  const fetchAiCredentials = () => {
    fetch('/api/admin/ai-credentials')
      .then(res => res.json())
      .then(data => {
        setGeminiApiKey(data.gemini_api_key || '');
        setOpenaiApiKey(data.openai_api_key || '');
        setDefaultProvider(data.default_provider || 'gemini');
        setDefaultModel(data.default_model || 'gemini-1.5-flash');
        setGlobalSystemPrompt(data.global_system_prompt || '');
      })
      .finally(() => setIsLoadingAi(false));
  };

  const fetchPlans = () => {
    fetch('/api/admin/plans')
      .then(res => res.json())
      .then(data => { if (data.plans) setPlans(data.plans); })
      .finally(() => setIsLoadingPlans(false));
  };

  const fetchNotifications = () => {
    fetch('/api/admin/notifications')
      .then(res => res.json())
      .then(data => { if (data.notifications) setNotifications(data.notifications); });
  };

  const fetchMenus = () => {
    fetch('/api/admin/menus')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data.menus)) setMenus(data.menus); })
      .finally(() => setIsLoadingMenus(false));
  };

  const toggleMenuEnabled = (key: string) => {
    setMenus(prev => prev.map(m => m.key === key ? { ...m, enabled: !m.enabled } : m));
  };

  const toggleMenuMaintenance = (key: string) => {
    setMenus(prev => prev.map(m => m.key === key ? { ...m, maintenance: !m.maintenance } : m));
  };

  const handleSaveMenus = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingMenus(true);
    try {
      const res = await fetch('/api/admin/menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menus })
      });
      if (res.ok) {
        toast.success('Menus atualizados com sucesso!');
        notifyMenusChanged();
      } else {
        toast.error('Erro ao salvar menus.');
      }
    } catch {
      toast.error('Erro de servidor ao salvar menus.');
    } finally {
      setIsSavingMenus(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, password: newPassword, name: newName, role: newRole })
      });
      if (res.ok) {
        toast.success('Usuário criado!');
        setShowCreateUserModal(false);
        fetchUsers();
      } else toast.error('Erro ao criar usuário');
    } finally { setIsCreatingUser(false); }
  };

  const openEditUserModal = (user: UserItem) => {
    setEditingUserId(user.id);
    setEditingUserName(user.name);
    setEditingUserEmail(user.email);
    setEditingUserRole(user.role.includes('Admin') ? 'Administrador' : 'Usuário');
    setEditingUserPassword('');
    setShowEditUserModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingUser(true);
    try {
      await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: editingUserId, name: editingUserName, email: editingUserEmail, role: editingUserRole, password: editingUserPassword })
      });
      toast.success('Usuário atualizado!');
      setShowEditUserModal(false);
      fetchUsers();
    } finally { setIsUpdatingUser(false); }
  };

  const handleChangeRole = async (userId: string, role: string) => {
    const toastId = toast.loading('Atualizando permissões...');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role })
      });
      if (res.ok) {
        toast.success('Papel do usuário atualizado!');
        fetchUsers();
      } else toast.error('Erro ao alterar papel.');
    } catch { toast.error('Erro de servidor.'); }
  };

  const executeDeleteUser = async () => {
    if (!confirmDeleteUserItem) return;
    setIsDeletingUser(true);
    try {
      const res = await fetch(`/api/admin/users?userId=${confirmDeleteUserItem.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Usuário removido!');
        setConfirmDeleteUserItem(null);
        fetchUsers();
      } else toast.error('Erro ao excluir usuário');
    } finally { setIsDeletingUser(false); }
  };

  const handleSaveMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingMeta(true);
    await fetch('/api/admin/meta-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meta_app_id: metaAppId, meta_app_secret: metaAppSecret, meta_verify_token: metaVerifyToken })
    });
    toast.success('Credenciais salvas!');
    setIsSavingMeta(false);
  };

  const handleSaveAi = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAi(true);
    await fetch('/api/admin/ai-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gemini_api_key: geminiApiKey, openai_api_key: openaiApiKey, default_provider: defaultProvider, default_model: defaultModel, global_system_prompt: globalSystemPrompt })
    });
    toast.success('IA atualizada!');
    setIsSavingAi(false);
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingPlan(true);
    await fetch('/api/admin/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: planName, price: Number(planPrice), message_limit: Number(planLimit), features: planFeatures.split(',') })
    });
    toast.success('Plano criado!');
    setShowCreatePlanModal(false);
    fetchPlans();
    setIsCreatingPlan(false);
  };

  const openEditPlanModal = (plan: PlanItem) => {
    setEditingPlanId(plan.id);
    setEditingPlanName(plan.name);
    setEditingPlanPrice(String(plan.price));
    setEditingPlanLimit(String(plan.message_limit));
    setEditingPlanFeatures(Array.isArray(plan.features) ? plan.features.join(', ') : String(plan.features || ''));
    setShowEditPlanModal(true);
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPlan(true);
    await fetch('/api/admin/plans', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingPlanId, name: editingPlanName, price: Number(editingPlanPrice), message_limit: Number(editingPlanLimit), features: editingPlanFeatures.split(',') })
    });
    toast.success('Plano atualizado!');
    setShowEditPlanModal(false);
    fetchPlans();
    setIsUpdatingPlan(false);
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Deseja excluir?')) return;
    await fetch(`/api/admin/plans?planId=${planId}`, { method: 'DELETE' });
    toast.success('Plano excluído!');
    fetchPlans();
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingNotif(true);
    await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: notifTitle, message: notifMessage, target_user: notifTarget, type: notifType })
    });
    toast.success('Notificação enviada!');
    setNotifTitle('');
    setNotifMessage('');
    fetchNotifications();
    setIsSendingNotif(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Abas Principais de Navegação Admin */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" /> Dashboard
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'users' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Users className="w-4 h-4" /> Usuários & RBAC
        </button>

        <button
          onClick={() => setActiveTab('meta')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'meta' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" /> API Oficial Meta
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'ai' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Sparkles className="w-4 h-4" /> Conexão IA (Gemini)
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'plans' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <CreditCard className="w-4 h-4" /> Planos & Assinaturas
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'notifications' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Bell className="w-4 h-4" /> Envio de Notificações
        </button>

        <button
          onClick={() => setActiveTab('menus')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'menus' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Menu className="w-4 h-4" /> Menus & Manutenção
        </button>
      </div>

      {/* 0. ABA: DASHBOARD GERAL ADMIN (Exibe APENAS a visão geral e os 4 KPIs) */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Banner Admin */}
          <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-purple-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-indigo-200 border border-white/10 mb-3">
                  <ShieldAlert className="w-3.5 h-3.5 text-yellow-400" /> PAINEL DO ADMINISTRADOR DO SISTEMA (CRUD COMPLETO)
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  Gestão Centralizada NexaChat
                </h1>
                <p className="text-xs md:text-sm text-gray-300 mt-1 max-w-xl">
                  Gerencie usuários, credenciais da Meta, conexões de IA (Gemini & OpenAI), controle de permissões e faturamento com persistência no Supabase.
                </p>
              </div>

              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 shrink-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-yellow-400 to-pink-500 flex items-center justify-center font-bold text-white shadow-sm">
                  👑
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{currentUser.name}</p>
                  <p className="text-[11px] text-indigo-200">{currentUser.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Cards de Métricas do Sistema */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div 
              onClick={() => setActiveTab('users')}
              className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4 cursor-pointer hover:shadow-md transition-all group"
            >
              <div className="w-11 h-11 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500">Usuários Cadastrados</p>
                <p className="text-xl font-bold text-gray-900">{users.length}</p>
              </div>
            </div>

            <div 
              onClick={() => setActiveTab('meta')}
              className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4 cursor-pointer hover:shadow-md transition-all group"
            >
              <div className="w-11 h-11 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500">API Meta Graph v22.0</p>
                <p className="text-xs font-bold text-emerald-600">Ativa no Banco</p>
              </div>
            </div>

            <div 
              onClick={() => setActiveTab('ai')}
              className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4 cursor-pointer hover:shadow-md transition-all group"
            >
              <div className="w-11 h-11 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500">Provedor de IA</p>
                <p className="text-xs font-bold text-purple-700 capitalize">{defaultProvider} ({defaultModel})</p>
              </div>
            </div>

            <div 
              onClick={() => setActiveTab('plans')}
              className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4 cursor-pointer hover:shadow-md transition-all group"
            >
              <div className="w-11 h-11 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500">Planos de Assinatura</p>
                <p className="text-xl font-bold text-gray-900">{plans.length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. ABA: USUÁRIOS CADASTRADOS & RBAC */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" /> Usuários Cadastrados
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Gerencie os acessos, crie novos usuários ou altere suas permissões em tempo real.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchUsers}
                className="px-3.5 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Atualizar Lista
              </button>
              <button
                onClick={() => setShowCreateUserModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-xs"
              >
                <UserPlus className="w-4 h-4" /> Criar Novo Usuário
              </button>
            </div>
          </div>

          {isLoadingUsers ? (
            <div className="py-12 text-center text-xs text-gray-400">Carregando usuários do Supabase...</div>
          ) : (
            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Usuário / Nome</th>
                    <th className="py-3.5 px-4">E-mail</th>
                    <th className="py-3.5 px-4">Nível de Permissão (Role)</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-gray-900">{user.name}</td>
                      <td className="py-3.5 px-4 text-gray-600 font-mono text-[11px]">{user.email}</td>
                      <td className="py-3.5 px-4">
                        {user.role.includes('Admin') ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-purple-100 text-purple-800 border border-purple-200 inline-flex items-center gap-1 shadow-2xs">
                            👑 Administrador
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-1 shadow-2xs">
                            🎧 Usuário
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          user.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {user.status === 'active' ? 'Ativo' : 'Pendente'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditUserModal(user)}
                            className="px-2.5 py-1 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex items-center gap-1 font-bold text-xs border border-indigo-200"
                            title="Editar Usuário"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Editar
                          </button>
                          <button
                            onClick={() => setConfirmDeleteUserItem(user)}
                            className="px-2.5 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center gap-1 font-bold text-xs border border-red-200"
                            title="Deletar Usuário"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Deletar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 2. ABA: API OFICIAL META INSTAGRAM */}
      {activeTab === 'meta' && (
        <form onSubmit={handleSaveMeta} className="bg-white rounded-2xl border-2 border-indigo-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-bold">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Configuração da API Oficial Meta (Developers)</h2>
                <p className="text-xs text-gray-500">Credenciais utilizadas para conectar contas reais do Instagram e receber Webhooks</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingMeta}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSavingMeta ? 'Salvando...' : 'Salvar Credenciais no Banco'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                META_APP_ID <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  required
                  value={metaAppId}
                  onChange={e => setMetaAppId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-mono font-semibold text-gray-900 pr-10 outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(metaAppId, 'metaAppId', 'META_APP_ID')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors p-1"
                  title="Copiar META_APP_ID"
                >
                  {copiedField === 'metaAppId' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                META_APP_SECRET <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type={showMetaSecret ? 'text' : 'password'}
                  required
                  value={metaAppSecret}
                  onChange={e => setMetaAppSecret(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 pr-16 outline-none focus:border-indigo-500"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowMetaSecret(!showMetaSecret)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                    title={showMetaSecret ? "Ocultar" : "Mostrar"}
                  >
                    {showMetaSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(metaAppSecret, 'metaAppSecret', 'META_APP_SECRET')}
                    className="text-gray-400 hover:text-indigo-600 transition-colors p-1"
                    title="Copiar META_APP_SECRET"
                  >
                    {copiedField === 'metaAppSecret' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                META_VERIFY_TOKEN <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  required
                  value={metaVerifyToken}
                  onChange={e => setMetaVerifyToken(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 pr-10 outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(metaVerifyToken, 'metaVerifyToken', 'META_VERIFY_TOKEN')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors p-1"
                  title="Copiar META_VERIFY_TOKEN"
                >
                  {copiedField === 'metaVerifyToken' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* LISTA COMPLETA DE ENDPOINTS DA API DO INSTAGRAM (META GRAPH API) */}
          <div className="pt-6 border-t border-indigo-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-600" /> Endpoints da API Oficial do Instagram (Meta Graph API v22.0)
                </h3>
                <p className="text-xs text-gray-500">Cadastre estes endpoints no seu aplicativo no painel <strong className="text-indigo-700">Meta for Developers</strong>.</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                ● Meta Graph API v22.0 Ativa
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. WEBHOOK RECEIVER */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-indigo-900 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-md text-[10px]">POST / GET</span>
                    1. Webhook Recebimento DMs & Eventos
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(webhookUrl, 'meta_ep_webhook', 'Endpoint Webhook')}
                    className="p-1.5 bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors shadow-xs"
                    title="Copiar URL"
                  >
                    {copiedField === 'meta_ep_webhook' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] font-mono text-indigo-800 bg-white/80 p-2 rounded-xl border border-indigo-100 break-all select-all">
                  {webhookUrl}
                </p>
                <p className="text-[11px] text-indigo-700 leading-snug">
                  Cadastrar em <strong>Instagram &gt; Webhooks &gt; Callback URL</strong>. Token de verificação: <code className="font-mono bg-indigo-100 px-1 rounded">{metaVerifyToken}</code>
                </p>
              </div>

              {/* 2. OAUTH CALLBACK */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-indigo-900 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 bg-blue-600 text-white rounded-md text-[10px]">GET</span>
                    2. OAuth Callback Login Instagram
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(`${webhookUrl.replace('/api/webhooks/instagram', '')}/api/auth/meta/callback`, 'meta_ep_oauth', 'OAuth Callback')}
                    className="p-1.5 bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors shadow-xs"
                    title="Copiar URL"
                  >
                    {copiedField === 'meta_ep_oauth' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] font-mono text-indigo-800 bg-white/80 p-2 rounded-xl border border-indigo-100 break-all select-all">
                  {webhookUrl.replace('/api/webhooks/instagram', '')}/api/auth/meta/callback
                </p>
                <p className="text-[11px] text-indigo-700 leading-snug">
                  Cadastrar em <strong>Configurações do Login do Facebook &gt; URIs de redirecionamento do OAuth válidos</strong>.
                </p>
              </div>

              {/* 3. DATA DELETION CALLBACK */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-indigo-900 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 bg-amber-600 text-white rounded-md text-[10px]">POST</span>
                    3. Data Deletion Callback (Meta Compliance)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(`${webhookUrl.replace('/api/webhooks/instagram', '')}/api/auth/meta/data-deletion`, 'meta_ep_datadel', 'Data Deletion URL')}
                    className="p-1.5 bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors shadow-xs"
                    title="Copiar URL"
                  >
                    {copiedField === 'meta_ep_datadel' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] font-mono text-indigo-800 bg-white/80 p-2 rounded-xl border border-indigo-100 break-all select-all">
                  {webhookUrl.replace('/api/webhooks/instagram', '')}/api/auth/meta/data-deletion
                </p>
                <p className="text-[11px] text-indigo-700 leading-snug">
                  Exigido no Meta App Review para cumprir regras de conformidade de exclusão de dados dos usuários.
                </p>
              </div>

              {/* 4. DEAUTHORIZE CALLBACK */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-indigo-900 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 bg-red-600 text-white rounded-md text-[10px]">POST</span>
                    4. Deauthorize Callback URL (Meta Compliance)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(`${webhookUrl.replace('/api/webhooks/instagram', '')}/api/auth/meta/deauthorize`, 'meta_ep_deauth', 'Deauthorize URL')}
                    className="p-1.5 bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors shadow-xs"
                    title="Copiar URL"
                  >
                    {copiedField === 'meta_ep_deauth' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] font-mono text-indigo-800 bg-white/80 p-2 rounded-xl border border-indigo-100 break-all select-all">
                  {webhookUrl.replace('/api/webhooks/instagram', '')}/api/auth/meta/deauthorize
                </p>
                <p className="text-[11px] text-indigo-700 leading-snug">
                  Endpoint acionado automaticamente pelo Facebook quando um cliente remove permissões do app.
                </p>
              </div>

              {/* 5. SEND MESSAGES GRAPH API ENDPOINT */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-indigo-900 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-md text-[10px]">POST</span>
                    5. Graph API Send Direct Message (Outbound)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy('https://graph.instagram.com/v22.0/me/messages', 'meta_ep_sendmsg', 'Send Message Endpoint')}
                    className="p-1.5 bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors shadow-xs"
                    title="Copiar URL"
                  >
                    {copiedField === 'meta_ep_sendmsg' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] font-mono text-indigo-800 bg-white/80 p-2 rounded-xl border border-indigo-100 break-all select-all">
                  https://graph.instagram.com/v22.0/me/messages
                </p>
                <p className="text-[11px] text-indigo-700 leading-snug">
                  Endpoint oficial da Meta Graph API v22.0 utilizado para disparar respostas automatizadas por IA.
                </p>
              </div>

              {/* 6. INSTAGRAM PROFILE GRAPH API ENDPOINT */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-indigo-900 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 bg-purple-600 text-white rounded-md text-[10px]">GET</span>
                    6. Graph API Profile & Media Fetch
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy('https://graph.instagram.com/v22.0/{ig_user_id}?fields=id,username,profile_picture_url', 'meta_ep_profile', 'Profile Endpoint')}
                    className="p-1.5 bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors shadow-xs"
                    title="Copiar URL"
                  >
                    {copiedField === 'meta_ep_profile' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] font-mono text-indigo-800 bg-white/80 p-2 rounded-xl border border-indigo-100 break-all select-all">
                  https://graph.instagram.com/v22.0/&#123;ig_user_id&#125;?fields=username,profile_picture_url
                </p>
                <p className="text-[11px] text-indigo-700 leading-snug">
                  Utilizado para consultar fotos de avatar, nome de usuário e metadados das contas conectadas.
                </p>
              </div>

              {/* 7. SEND IMAGE ENDPOINT */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-indigo-900 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-md text-[10px]">POST</span>
                    7. Enviar Imagem (Image Media)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy('https://graph.facebook.com/v22.0/{ig_user_id}/messages', 'meta_ep_image', 'Image Endpoint')}
                    className="p-1.5 bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors shadow-xs"
                    title="Copiar URL"
                  >
                    {copiedField === 'meta_ep_image' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] font-mono text-indigo-800 bg-white/80 p-2 rounded-xl border border-indigo-100 break-all select-all">
                  https://graph.facebook.com/v22.0/&#123;ig_user_id&#125;/messages
                </p>
                <p className="text-[11px] text-indigo-700 leading-snug">
                  Payload: <code>{`{"message": {"attachment": {"type": "image", "payload": {"url": "URL_AQUI"}}}}`}</code>
                </p>
              </div>

              {/* 8. SEND VIDEO ENDPOINT */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-indigo-900 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-md text-[10px]">POST</span>
                    8. Enviar Vídeo (Video Media)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy('https://graph.facebook.com/v22.0/{ig_user_id}/messages', 'meta_ep_video', 'Video Endpoint')}
                    className="p-1.5 bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors shadow-xs"
                    title="Copiar URL"
                  >
                    {copiedField === 'meta_ep_video' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] font-mono text-indigo-800 bg-white/80 p-2 rounded-xl border border-indigo-100 break-all select-all">
                  https://graph.facebook.com/v22.0/&#123;ig_user_id&#125;/messages
                </p>
                <p className="text-[11px] text-indigo-700 leading-snug">
                  Payload: <code>{`{"message": {"attachment": {"type": "video", "payload": {"url": "URL_AQUI"}}}}`}</code>
                </p>
              </div>

              {/* 9. SEND AUDIO ENDPOINT */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-indigo-900 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-md text-[10px]">POST</span>
                    9. Enviar Áudio (Audio Media)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy('https://graph.facebook.com/v22.0/{ig_user_id}/messages', 'meta_ep_audio', 'Audio Endpoint')}
                    className="p-1.5 bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors shadow-xs"
                    title="Copiar URL"
                  >
                    {copiedField === 'meta_ep_audio' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] font-mono text-indigo-800 bg-white/80 p-2 rounded-xl border border-indigo-100 break-all select-all">
                  https://graph.facebook.com/v22.0/&#123;ig_user_id&#125;/messages
                </p>
                <p className="text-[11px] text-indigo-700 leading-snug">
                  Payload: <code>{`{"message": {"attachment": {"type": "audio", "payload": {"url": "URL_AQUI"}}}}`}</code>
                </p>
              </div>

              {/* 10. SEND PDF / FILE ENDPOINT */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-indigo-900 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-md text-[10px]">POST</span>
                    10. Enviar Documento (PDF / File)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy('https://graph.facebook.com/v22.0/{ig_user_id}/messages', 'meta_ep_file', 'File Endpoint')}
                    className="p-1.5 bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors shadow-xs"
                    title="Copiar URL"
                  >
                    {copiedField === 'meta_ep_file' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] font-mono text-indigo-800 bg-white/80 p-2 rounded-xl border border-indigo-100 break-all select-all">
                  https://graph.facebook.com/v22.0/&#123;ig_user_id&#125;/messages
                </p>
                <p className="text-[11px] text-indigo-700 leading-snug">
                  Payload: <code>{`{"message": {"attachment": {"type": "file", "payload": {"url": "URL_AQUI"}}}}`}</code>
                </p>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* 3. ABA: CONEXÃO IA (GEMINI & OPENAI) */}
      {activeTab === 'ai' && (
        <form onSubmit={handleSaveAi} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Conexão da API de IA (Google Gemini & OpenAI LLM)</h2>
                <p className="text-xs text-gray-500">Configure as chaves e modelos de inteligência artificial que responderão as DMs</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingAi}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSavingAi ? 'Salvando...' : 'Salvar & Testar Conexão da IA'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">GEMINI_API_KEY (Google AI Studio)</label>
              <div className="relative">
                <input
                  type={showGeminiKey ? 'text' : 'password'}
                  value={geminiApiKey}
                  onChange={e => setGeminiApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 pr-10 outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">OPENAI_API_KEY (OpenAI Platform)</label>
              <div className="relative">
                <input
                  type={showOpenaiKey ? 'text' : 'password'}
                  value={openaiApiKey}
                  onChange={e => setOpenaiApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 pr-10 outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showOpenaiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Provedor Padrão do Sistema</label>
              <select
                value={defaultProvider}
                onChange={e => setDefaultProvider(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white outline-none cursor-pointer"
              >
                <option value="gemini">Google Gemini (Gratuito & Rápido)</option>
                <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Modelo Padrão da IA</label>
              <select
                value={defaultModel}
                onChange={e => setDefaultModel(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white outline-none cursor-pointer"
              >
                <option value="gemini-1.5-flash">gemini-1.5-flash (Ultra Rápido)</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro (Raciocínio Complexo)</option>
                <option value="gpt-4o-mini">gpt-4o-mini (Econômico)</option>
                <option value="gpt-4o">gpt-4o (Avançado)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">System Prompt Global (Instruções Base da IA)</label>
            <textarea
              rows={3}
              value={globalSystemPrompt}
              onChange={e => setGlobalSystemPrompt(e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-purple-500 resize-none"
            />
          </div>
        </form>
      )}

      {/* 4. ABA: PLANOS & ASSINATURAS */}
      {activeTab === 'plans' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-600" /> Criar & Gerenciar Planos de Assinatura (CRUD)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Defina os valores mensais, limites de DMs e funcionalidades de cada plano do SaaS.</p>
            </div>
            <button
              onClick={() => setShowCreatePlanModal(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-xs"
            >
              <Plus className="w-4 h-4" /> Criar Novo Plano
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((plan) => (
              <div key={plan.id} className="border border-gray-200 rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-sm text-gray-900">{plan.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Ativo</span>
                  </div>

                  <div className="text-2xl font-black text-gray-900 mb-3">
                    R$ {plan.price} <span className="text-xs font-normal text-gray-500">/mês</span>
                  </div>

                  <p className="text-xs font-bold text-gray-700 mb-2">Limite: {plan.message_limit.toLocaleString()} DMs/mês</p>

                  <ul className="space-y-1.5 text-xs text-gray-600 mb-4">
                    {plan.features?.map((f, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <button
                    onClick={() => openEditPlanModal(plan)}
                    className="text-amber-600 hover:underline text-xs font-bold flex items-center gap-1"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Editar Plano
                  </button>
                  <button
                    onClick={() => handleDeletePlan(plan.id)}
                    className="text-red-600 hover:underline text-xs font-bold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir Plano
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. ABA: ENVIO DE NOTIFICAÇÕES */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" /> Disparo de Notificações de Sistema para os Usuários
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Envie comunicados globais, alertas de atualização ou recados para a base de clientes.</p>
          </div>

          <form onSubmit={handleSendNotification} className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Título da Notificação</label>
              <input
                type="text"
                required
                value={notifTitle}
                onChange={e => setNotifTitle(e.target.value)}
                placeholder="Ex: 🚀 Atualização de Segurança no NexaChat"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Mensagem do Alerta</label>
              <textarea
                required
                rows={3}
                value={notifMessage}
                onChange={e => setNotifMessage(e.target.value)}
                placeholder="Escreva a mensagem completa..."
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Destinatário</label>
                <select
                  value={notifTarget}
                  onChange={e => setNotifTarget(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white outline-none cursor-pointer"
                >
                  <option value="Todos os Usuários">Todos os Usuários Cadastrados</option>
                  <option value="admin@nexachat.com">Apenas Administradores</option>
                  <option value="eberfsj@gmail.com">eberfsj@gmail.com</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Tipo de Notificação</label>
                <select
                  value={notifType}
                  onChange={e => setNotifType(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white outline-none cursor-pointer"
                >
                  <option value="info">Informação / Atualização</option>
                  <option value="success">Sucesso / Conquista</option>
                  <option value="warning">Alerta de Manutenção</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSendingNotif}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              <Bell className="w-4 h-4" />
              {isSendingNotif ? 'Enviando...' : 'Enviar Notificação aos Usuários'}
            </button>
          </form>

          {/* Histórico de Notificações */}
          <div className="pt-4">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Histórico de Mensagens Enviadas</h3>
            <div className="space-y-2">
              {notifications.map((n) => (
                <div key={n.id} className="border border-gray-200 rounded-xl p-3.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-gray-900">{n.title}</p>
                    <p className="text-gray-600 text-[11px] mt-0.5">{n.message}</p>
                    <p className="text-gray-400 text-[10px] mt-1">Para: {n.target_user} • {new Date(n.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <span className="bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-full text-[10px] capitalize">
                    {n.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR NOVO USUÁRIO */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setShowCreateUserModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Cadastrar Novo Usuário</h3>
                <p className="text-xs text-gray-500">Crie o acesso e defina o papel no banco Supabase</p>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="joao@suaempresa.com"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Senha Inicial</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nível de Permissão (Role)</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-indigo-500 bg-white cursor-pointer"
                >
                  <option value="Administrador">👑 Administrador (Acesso Total)</option>
                  <option value="Usuário">🎧 Usuário (Acesso Padrão)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                >
                  {isCreatingUser ? 'Criando...' : 'Salvar no Banco'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR NOVO PLANO */}
      {showCreatePlanModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setShowCreatePlanModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Criar Novo Plano de Assinatura</h3>
                <p className="text-xs text-gray-500">Cadastre preços e limites para o SaaS</p>
              </div>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome do Plano</label>
                <input
                  type="text"
                  required
                  value={planName}
                  onChange={e => setPlanName(e.target.value)}
                  placeholder="Ex: Plano Scale Pro"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Preço Mensal (R$)</label>
                  <input
                    type="number"
                    required
                    value={planPrice}
                    onChange={e => setPlanPrice(e.target.value)}
                    placeholder="197"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Limite DMs/mês</label>
                  <input
                    type="number"
                    required
                    value={planLimit}
                    onChange={e => setPlanLimit(e.target.value)}
                    placeholder="100000"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Recursos Inclusos (separados por vírgula)</label>
                <input
                  type="text"
                  value={planFeatures}
                  onChange={e => setPlanFeatures(e.target.value)}
                  placeholder="DMs Ilimitadas, IA Gemini, Suporte 24/7"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreatePlanModal(false)}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingPlan}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                >
                  {isCreatingPlan ? 'Criando...' : 'Salvar Plano'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR PLANO EXISTENTE */}
      {showEditPlanModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setShowEditPlanModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <Pencil className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Editar Plano de Assinatura</h3>
                <p className="text-xs text-gray-500">Atualize valores e limites do plano no banco</p>
              </div>
            </div>

            <form onSubmit={handleUpdatePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome do Plano</label>
                <input
                  type="text"
                  required
                  value={editingPlanName}
                  onChange={e => setEditingPlanName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Preço Mensal (R$)</label>
                  <input
                    type="number"
                    required
                    value={editingPlanPrice}
                    onChange={e => setEditingPlanPrice(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Limite DMs/mês</label>
                  <input
                    type="number"
                    required
                    value={editingPlanLimit}
                    onChange={e => setEditingPlanLimit(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Recursos Inclusos (separados por vírgula)</label>
                <input
                  type="text"
                  value={editingPlanFeatures}
                  onChange={e => setEditingPlanFeatures(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditPlanModal(false)}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPlan}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                >
                  {isUpdatingPlan ? 'Atualizando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. ABA: MENUS & MANUTENÇÃO */}
      {activeTab === 'menus' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Menu className="w-5 h-5 text-indigo-600" /> Menus & Manutenção
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Ative/desative menus do painel dos usuários ou coloque páginas em manutenção em tempo real.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchMenus}
                className="px-3.5 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Atualizar
              </button>
              <button
                onClick={handleSaveMenus}
                disabled={isSavingMenus}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {isSavingMenus ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Menus do Painel dos Usuários</p>
            {isLoadingMenus ? (
              <div className="text-xs text-gray-500 py-8 text-center">Carregando menus...</div>
            ) : (
              menus.map((menu) => (
                <div
                  key={menu.key}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border transition-colors ${
                    !menu.enabled ? 'bg-red-50/60 border-red-200' : menu.maintenance ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                      !menu.enabled ? 'bg-red-100 text-red-600' : menu.maintenance ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'
                    }`}>
                      {menu.maintenance ? <Wrench className="w-5 h-5" /> : <Power className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900">{menu.label}</p>
                      <p className="text-[11px] font-mono text-gray-500 truncate">{menu.href}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {!menu.enabled && (
                      <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">
                        DESATIVADO
                      </span>
                    )}
                    {menu.enabled && menu.maintenance && (
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold">
                        EM MANUTENÇÃO
                      </span>
                    )}
                    {menu.enabled && !menu.maintenance && (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold">
                        ATIVO
                      </span>
                    )}
                    <button
                      onClick={() => toggleMenuEnabled(menu.key)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 border ${
                        menu.enabled
                          ? 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                          : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      {menu.enabled ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      onClick={() => toggleMenuMaintenance(menu.key)}
                      disabled={!menu.enabled}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 border disabled:opacity-40 disabled:cursor-not-allowed ${
                        menu.maintenance
                          ? 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                          : 'bg-amber-500 border-amber-500 text-white hover:bg-amber-600'
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      {menu.maintenance ? 'Sair da Manutenção' : 'Manutenção'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4 text-[11px] text-indigo-900 leading-relaxed">
            <p className="font-bold mb-1">📌 Como funciona:</p>
            <p>
              <b>Desativado:</b> o menu some da barra lateral e a página bloqueia o acesso ao ser aberta diretamente.
              <br />
              <b>Em manutenção:</b> o menu continua visível com selo de manutenção e a página exibe um aviso temporário.
              <br />
              Alterações valem para todos os usuários instantaneamente após salvar.
            </p>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR USUÁRIO */}
      {showEditUserModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setShowEditUserModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Pencil className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Editar Usuário</h3>
                <p className="text-xs text-gray-500">Atualize os dados e crie uma nova senha para o usuário</p>
              </div>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={editingUserName}
                  onChange={e => setEditingUserName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Endereço de E-mail</label>
                <input
                  type="email"
                  required
                  value={editingUserEmail}
                  onChange={e => setEditingUserEmail(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nível de Permissão (Role)</label>
                <select
                  value={editingUserRole}
                  onChange={e => setEditingUserRole(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white outline-none cursor-pointer"
                >
                  <option value="Administrador">👑 Administrador (Acesso Total)</option>
                  <option value="Usuário">🎧 Usuário (Acesso Padrão)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nova Senha <span className="text-gray-400 font-normal">(deixe em branco para não alterar)</span>
                </label>
                <input
                  type="password"
                  name="new-password"
                  autoComplete="new-password"
                  placeholder="Digite a nova senha se desejar alterar..."
                  value={editingUserPassword}
                  onChange={e => setEditingUserPassword(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditUserModal(false)}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingUser}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                >
                  {isUpdatingUser ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ALERTA DE CONFIRMAÇÃO PARA DELETAR USUÁRIO */}
      {confirmDeleteUserItem && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-red-200 rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setConfirmDeleteUserItem(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Excluir Usuário do Banco</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Tem certeza que deseja deletar a conta de <span className="font-bold text-gray-900">{confirmDeleteUserItem.name}</span> (<span className="font-mono text-red-600">{confirmDeleteUserItem.email}</span>)?
                </p>
                <p className="text-[11px] text-red-500 font-semibold mt-2">
                  ⚠️ Esta ação é irreversível e excluirá permanentemente o acesso do usuário ao sistema.
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setConfirmDeleteUserItem(null)}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={executeDeleteUser}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50"
              >
                {isDeletingUser ? 'Excluindo...' : 'Sim, Excluir Usuário'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
