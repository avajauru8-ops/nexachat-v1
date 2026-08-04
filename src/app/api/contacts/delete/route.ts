import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { contactId } = await req.json();
    if (!contactId) return NextResponse.json({ error: 'contactId é obrigatório' }, { status: 400 });

    // Verificar se o contato pertence ao workspace do usuário
    const { data: workspace } = await supabaseAdmin
      .from('workspaces')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!workspace) return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });

    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('id, workspace_id')
      .eq('id', contactId)
      .eq('workspace_id', workspace.id)
      .maybeSingle();

    if (!contact) return NextResponse.json({ error: 'Contato não encontrado ou sem permissão' }, { status: 404 });

    // Excluir em cascata (mensagens → conversas → tags → contato)
    // As FK com ON DELETE CASCADE cuidam das conversas e mensagens automaticamente
    const { error } = await supabaseAdmin
      .from('contacts')
      .delete()
      .eq('id', contactId);

    if (error) {
      console.error('[Delete Contact] Erro:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Lead excluído com sucesso' });
  } catch (err) {
    console.error('[Delete Contact] Erro geral:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
