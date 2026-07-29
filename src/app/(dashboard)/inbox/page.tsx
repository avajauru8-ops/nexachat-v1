import { InboxClient } from '@/components/inbox/InboxClient';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function InboxPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  let { data: workspace } = await supabase.from('workspaces').select('id').eq('user_id', user.id).single();
  if (!workspace) {
    const { data: latestWs } = await supabase.from('workspaces').select('id').order('created_at', { ascending: false }).limit(1).single();
    workspace = latestWs;
  }
  
  if (!workspace?.id) {
    return <div className="p-8 text-center text-slate-500">Workspace não encontrado.</div>;
  }

  return <InboxClient workspaceId={workspace.id} />;
}
