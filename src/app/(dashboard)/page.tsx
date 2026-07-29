import { Users, MessageCircle, Zap, TrendingUp } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // 1. Obter workspace do usuário
  let { data: workspace } = await supabase.from('workspaces').select('*').eq('user_id', user.id).single();
  if (!workspace) {
    const { data: latestWs } = await supabase.from('workspaces').select('*').order('created_at', { ascending: false }).limit(1).single();
    workspace = latestWs;
  }
  
  let totalLeads = 0;
  let totalMessages = 0;
  let activeFlows = 0;
  let connectedAccounts: Array<Record<string, unknown>> = [];

  if (workspace) {
    const [
      { count: leadsCount }, 
      { count: messagesCount },
      { count: flowsCount },
      { data: accounts }
    ] = await Promise.all([
      supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
      supabase.from('messages').select('*', { count: 'exact', head: true }),
      supabase.from('flows').select('*', { count: 'exact', head: true }).eq('workspace_id', workspace.id).eq('status', 'active'),
      supabase.from('instagram_accounts').select('id, page_id, ig_user_id, status').eq('workspace_id', workspace.id)
    ]);
    
    totalLeads = leadsCount || 0;
    totalMessages = messagesCount || 0;
    activeFlows = flowsCount || 0;
    connectedAccounts = (accounts || []) as Array<Record<string, unknown>>;
  }

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen bg-slate-50">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Painel Principal</h1>
          <p className="text-slate-500 text-sm">Gerencie suas automações e veja o resumo da sua operação.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total de Leads', value: totalLeads, change: '+12%', icon: Users },
          { title: 'Mensagens Trocadas', value: totalMessages, change: '+25%', icon: MessageCircle },
          { title: 'Automações Ativas', value: activeFlows, change: 'Estável', icon: Zap },
          { title: 'Taxa de Resposta', value: '98%', change: '+3%', icon: TrendingUp },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.title}</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</p>
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
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-lg bg-slate-50 min-h-[220px]">
            <p className="text-slate-400 text-sm font-medium">O gráfico de atividade será exibido aqui</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col p-5 overflow-hidden">
          <h3 className="font-bold text-slate-800 mb-4 shrink-0">Contas Conectadas</h3>
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-3">
              {connectedAccounts.length > 0 ? connectedAccounts.map((acc, i) => (
                <div key={i} className="flex items-center p-3 border border-slate-100 rounded-lg hover:border-pink-200 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px] shrink-0">
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-pink-600 font-bold text-xs">
                      IG
                    </div>
                  </div>
                  <div className="ml-3 min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      @{String(acc.page_id || '').startsWith('278') || !acc.page_id ? 'eberoficiall' : String(acc.page_id)}
                    </p>
                    <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Conectado
                    </p>
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
            <a 
              href="/api/auth/meta" 
              className="block text-center w-full py-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white rounded-lg text-sm font-bold shadow-sm hover:opacity-95 transition-opacity"
            >
              + Conectar Nova Conta
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
