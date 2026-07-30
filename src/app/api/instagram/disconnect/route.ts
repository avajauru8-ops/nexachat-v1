import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Busca o workspace do usuário
    const { data: workspace } = await serviceSupabase
      .from('workspaces')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    // Remove a conta do Instagram do banco
    const { error } = await serviceSupabase
      .from('instagram_accounts')
      .delete()
      .eq('workspace_id', workspace.id);

    if (error) {
      console.error('Erro ao desconectar:', error);
      return NextResponse.json({ error: 'Erro ao desconectar' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Disconnect error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
