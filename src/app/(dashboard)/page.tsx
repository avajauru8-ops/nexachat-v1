import { Users, MessageCircle, Zap, TrendingUp, Play, Key } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import ConnectAccountDropdown from '@/components/dashboard/ConnectAccountDropdown';
import RecentActivityClient from '@/components/dashboard/RecentActivityClient';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Buscar workspace
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('user_id', user?.id)
    .single();

  let totalLeads = 0;
  let prevLeads = 0;
  let totalMessages = 0;
  let prevMessages = 0;
  let activeFlows = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let connectedAccounts: any[] = [];

  if (workspace) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: leadsCount }, 
      { count: prevLeadsCount },
      { count: messagesCount }, 
      { count: prevMessagesCount },
      { count: flowsCount }, 
      { data: accounts }
    ] = await Promise.all([
      supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id).gte('created_at', sevenDaysAgo),
      supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id).gte('created_at', fourteenDaysAgo).lt('created_at', sevenDaysAgo),
      supabase.from('messages').select('id', { count: 'exact', head: true }).eq('sender_type', 'user').gte('timestamp', sevenDaysAgo),
      supabase.from('messages').select('id', { count: 'exact', head: true }).eq('sender_type', 'user').gte('timestamp', fourteenDaysAgo).lt('timestamp', sevenDaysAgo),
      supabase.from('flows').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id).eq('status', 'active'),
      supabase.from('instagram_accounts').select('ig_user_id, page_id, status, access_token').eq('workspace_id', workspace.id).eq('status', 'active')
    ]);
    
    totalLeads = leadsCount || 0;
    prevLeads = prevLeadsCount || 0;
    totalMessages = messagesCount || 0;
    prevMessages = prevMessagesCount || 0;
    activeFlows = flowsCount || 0;
    // Resolve usernames
    connectedAccounts = await Promise.all(
      (accounts || []).map(async (acc) => {
        const dbUsername = acc.page_id && acc.page_id !== 'ig_login_direct' ? acc.page_id : acc.ig_user_id;
        let profilePic = null;
        let username = dbUsername;

        try {
          const isMetaToken = acc.access_token && acc.access_token.startsWith('EAA');
          const apiUrl = isMetaToken
            ? `https://graph.facebook.com/v22.0/${acc.ig_user_id}?fields=username,profile_picture_url&access_token=${acc.access_token}`
            : `https://graph.instagram.com/v22.0/me?fields=username,profile_picture_url&access_token=${acc.access_token}`;
            
          const res = await fetch(apiUrl);
          const data = await res.json();
          if (data.username) username = data.username;
          if (data.profile_picture_url) profilePic = data.profile_picture_url;
        } catch (err) {
          console.error("Failed to fetch IG profile picture", err);
        }

        return { ...acc, username, profile_picture_url: profilePic };
      })
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let recentLogs: any[] = [];
  if (workspace) {
    const { data: logs } = await supabase
      .from('flow_logs')
      .select('*, flows(name)')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (logs) recentLogs = logs;
  }

  // Calculando variações
  const calcChange = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? '+100%' : '0%';
    const diff = ((curr - prev) / prev) * 100;
    return `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`;
  };

  const leadsChange = calcChange(totalLeads, prevLeads);
  const messagesChange = calcChange(totalMessages, prevMessages);

  // Taxa de Conversão: Leads capturados / Mensagens recebidas
  const currentConvRate = totalMessages > 0 ? (totalLeads / totalMessages) * 100 : 0;
  const prevConvRate = prevMessages > 0 ? (prevLeads / prevMessages) * 100 : 0;
  const convRateChange = prevConvRate === 0 
    ? (currentConvRate > 0 ? '+100%' : '0%') 
    : `${currentConvRate - prevConvRate > 0 ? '+' : ''}${(currentConvRate - prevConvRate).toFixed(1)}%`;

  const stats = [
    { title: 'Novos Leads', value: totalLeads.toLocaleString('pt-BR'), icon: Users, change: leadsChange, positive: totalLeads >= prevLeads },
    { title: 'Mensagens Recebidas', value: totalMessages.toLocaleString('pt-BR'), icon: MessageCircle, change: messagesChange, positive: totalMessages >= prevMessages },
    { title: 'Automações Ativas', value: activeFlows.toString(), icon: Zap, change: '0%', positive: true },
    { title: 'Taxa de Conversão', value: `${currentConvRate.toFixed(1)}%`, icon: TrendingUp, change: convRateChange, positive: currentConvRate >= prevConvRate },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Visão Geral</h1>
        <div className="flex gap-3">
          <button className="px-5 py-2.5 text-sm bg-white/60 backdrop-blur-md border border-white/80 rounded-xl text-gray-700 hover:bg-white transition-all font-semibold shadow-sm">
            Últimos 7 dias
          </button>
          <button className="px-5 py-2.5 text-sm bg-instagram-gradient rounded-xl text-white hover:opacity-90 transition-opacity font-bold shadow-md shadow-pink-500/20">
            Criar Automação
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="glass-panel p-6 rounded-3xl flex flex-col justify-between group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wider">{stat.title}</p>
                  <h3 className="text-3xl font-black text-gray-800 tracking-tight">{stat.value}</h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-instagram-gradient flex items-center justify-center text-white shadow-lg shadow-pink-500/25 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className={`text-sm font-medium ${stat.positive ? 'text-emerald-600' : 'text-red-600'}`}>
                  {stat.change}
                </span>
                <span className="text-sm text-gray-400 ml-2">vs último período</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RecentActivityClient recentLogs={recentLogs} userTimezone={user?.user_metadata?.timezone || 'America/Sao_Paulo'} />
        <div className="glass-panel rounded-3xl p-6">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight mb-5">Contas Conectadas</h2>
          <div className="mt-2 space-y-4">
            {connectedAccounts.length > 0 ? (
              connectedAccounts.map((account, idx) => (
                <div key={idx} className="flex items-center justify-between p-3.5 bg-white/60 border border-white rounded-2xl hover:bg-white/80 transition-colors shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center gap-3.5">
                    {account.profile_picture_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={account.profile_picture_url} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-pink-500" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white flex items-center justify-center shadow-sm flex-shrink-0">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                        </svg>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-800 text-sm">Instagram</p>
                      <p className="text-gray-500 text-xs">@{account.username && account.username !== account.ig_user_id ? account.username : 'eberoficiall'}</p>
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${account.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">Nenhuma conta conectada ainda.</p>
            )}
          </div>
          <ConnectAccountDropdown />
        </div>
      </div>
    </div>
  );
}
