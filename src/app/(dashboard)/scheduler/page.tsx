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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-instagram-gradient flex items-center justify-center text-white shadow-md shadow-pink-500/20">
              <CalendarClock className="w-5 h-5" />
            </div>
            Agendamento de Posts & Reels
          </h1>
          <p className="text-gray-500 mt-1">Planeje e publique conteúdo no Instagram na hora certa, no formato certo.</p>
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
