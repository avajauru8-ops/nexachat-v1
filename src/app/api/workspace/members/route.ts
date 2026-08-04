import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// Lista os membros do workspace do usuário autenticado
// (usado no seletor de atribuição de agente no Painel CRM)
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: workspace } = await serviceSupabase
      .from('workspaces')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (!workspace) {
      return NextResponse.json({ members: [] });
    }

    const { data: members, error } = await serviceSupabase
      .from('workspace_members')
      .select('id, user_id, role')
      .eq('workspace_id', workspace.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const memberUserIds = (members || []).map(m => m.user_id);

    let usersByName: Record<string, { email: string; name: string }> = {};
    if (memberUserIds.length > 0) {
      const { data: { users } } = await serviceSupabase.auth.admin.listUsers();
      usersByName = Object.fromEntries(
        (users || [])
          .filter(u => memberUserIds.includes(u.id))
          .map(u => [
            u.id,
            {
              email: u.email || '',
              name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Membro'
            }
          ])
      );
    }

    const formattedMembers = (members || []).map(m => ({
      id: m.id,
      user_id: m.user_id,
      role: m.role,
      email: usersByName[m.user_id]?.email || '',
      name: usersByName[m.user_id]?.name || 'Membro'
    }));

    return NextResponse.json({ members: formattedMembers });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro interno no servidor';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
