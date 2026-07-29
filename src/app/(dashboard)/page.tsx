import { Users, MessageCircle, Zap, TrendingUp } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Obter métricas reais do banco de dados
  const { data: profile } = await supabase.from('profiles').select('workspace_id').eq('id', user.id).single();
  let workspace = null;
  
  let totalLeads = 0;
  let totalMessages = 0;
  let activeFlows = 0;
  let connectedAccounts = [];

  if (profile?.workspace_id) {
    const { data: ws } = await supabase.from('workspaces').select('*').eq('id', profile.workspace_id).single();
    workspace = ws;

    const [
      { count: leadsCount }, 
      { count: messagesCount },
      { count: flowsCount },
      { data: accounts }
    ] = await Promise.all([
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
      supabase.from('automation_flows').select('*', { count: 'exact', head: true }).eq('workspace_id', workspace.id).eq('is_active', true),
      supabase.from('instagram_accounts').select('ig_user_id, status').eq('workspace_id', workspace.id)
    ]);
    
    totalLeads = leadsCount || 0;
    totalMessages = messagesCount || 0;
    activeFlows = flowsCount || 0;
    connectedAccounts = accounts || [];
  }

  const stats = [
    { title: 'Total de Leads', value: totalLeads.toString(), change: '+12%', icon: Users },
    { title: 'Mensagens Trocadas', value: totalMessages.toString(), change: '+24%', icon: MessageCircle },
    { title: 'Automações Ativas', value: activeFlows.toString(), change: '0%', icon: Zap },
    { title: 'Taxa de Resposta', value: '0%', change: '+5%', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Visão Geral</h1>
        <div className="flex gap-2">
          {/* Pode adicionar botões de ação aqui */}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">{stat.title}</p>
                  <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
                </div>
                <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center text-blue-600">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-center">
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{stat.change}</span>
                <span className="text-xs text-slate-400 ml-2">últimos 30 dias</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col p-5">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h3 className="font-bold text-slate-800">Atividade Recente</h3>
          </div>
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-lg bg-slate-50">
            <p className="text-slate-400 text-sm font-medium">O gráfico de atividade será exibido aqui</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col p-5 overflow-hidden">
          <h3 className="font-bold text-slate-800 mb-4 shrink-0">Contas Conectadas</h3>
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-3">
              {connectedAccounts.length > 0 ? connectedAccounts.map((acc, i) => (
                <div key={i} className="flex items-center p-3 border border-slate-100 rounded-lg hover:border-blue-100 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-[2px]">
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                      <span className="font-bold text-xs">IG</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-semibold text-slate-800">@{acc.ig_user_id || 'Instagram'}</p>
                    <p className="text-xs text-emerald-600 font-medium">Conectado</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-6 text-sm text-slate-500 font-medium">
                  Nenhuma conta conectada.
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 shrink-0">
            <button className="w-full py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors">
              + Conectar Nova Conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
