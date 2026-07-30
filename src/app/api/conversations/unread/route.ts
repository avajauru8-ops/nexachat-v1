import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!workspace) {
      return NextResponse.json({ unreadCount: 0 });
    }

    // Sum all unread_count for the workspace
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('unread_count')
      .eq('workspace_id', workspace.id)
      .gt('unread_count', 0);

    if (error) {
      return NextResponse.json({ error: 'Erro ao buscar' }, { status: 500 });
    }

    const totalUnread = conversations.reduce((acc, curr) => acc + (curr.unread_count || 0), 0);

    return NextResponse.json({ unreadCount: totalUnread });
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
