import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { SettingsClient } from './SettingsClient';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let initialUser = null;
  let initialWorkspace = null;

  if (user) {
    const meta = user.user_metadata || {};
    initialUser = {
      id: user.id,
      email: user.email || '',
      fullName: meta.full_name || meta.name || user.email?.split('@')[0] || 'Usuário',
      role: meta.role || 'Administrador',
      language: meta.language || 'pt-BR',
      timezone: meta.timezone || 'America/Sao_Paulo',
      avatarUrl: meta.avatar_url || meta.picture || meta.avatar || ''
    };

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: workspace } = await serviceSupabase
      .from('workspaces')
      .select('id, name')
      .eq('user_id', user.id)
      .maybeSingle();

    if (workspace) {
      initialWorkspace = workspace;
    }
  }

  return <SettingsClient initialUser={initialUser} initialWorkspace={initialWorkspace} />;
}
