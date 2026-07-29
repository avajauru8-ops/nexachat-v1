import { InboxClient } from '@/components/inbox/InboxClient';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function InboxPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase.from('profiles').select('workspace_id').eq('id', user.id).single();
  
  if (!profile?.workspace_id) {
    return <div className="p-8 text-center text-slate-500">Workspace não encontrado.</div>;
  }

  return <InboxClient workspaceId={profile.workspace_id} />;
}
