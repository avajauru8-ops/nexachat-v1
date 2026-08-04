import { createClient } from '@/utils/supabase/server';
import { SchedulerClient } from './SchedulerClient';
import { CalendarClock } from 'lucide-react';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SchedulerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!workspace) {
    return (
      <div className="glass-panel rounded-3xl p-8 text-center text-gray-500">
        Workspace não encontrado.
      </div>
    );
  }

  const { data: accounts } = await supabase
    .from('instagram_accounts')
    .select('id, ig_user_id, page_id, ig_username')
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: true });

  let posts: Record<string, unknown>[] = [];
  let tableExists = true;

  try {
    const { data, error } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('scheduled_at', { ascending: true });

    if (error) {
      if (/does not exist|relation/i.test(error.message)) {
        tableExists = false;
      } else {
        console.error('Erro ao buscar agendamentos:', error);
      }
    } else {
      posts = data || [];
    }
  } catch {
    tableExists = false;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-600 via-fuchsia-600 to-purple-700 p-7 text-white shadow-xl shadow-pink-500/25">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 left-1/3 w-56 h-56 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shadow-inner">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-[220px]">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Agendamento de Posts & Reels</h1>
            <p className="text-white/80 mt-0.5 text-sm">Planeje e publique conteúdo no Instagram na hora certa, no formato certo.</p>
          </div>
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
            Publicação automática
          </div>
        </div>
      </div>

      <SchedulerClient
        workspaceId={workspace.id}
        accounts={accounts || []}
        initialPosts={posts}
        tableExists={tableExists}
      />
    </div>
  );
}
