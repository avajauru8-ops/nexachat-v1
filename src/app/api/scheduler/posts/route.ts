import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await request.json();
    const { instagramAccountId, mediaType, caption, mediaUrl, scheduledAt } = body;

    if (!instagramAccountId) return NextResponse.json({ error: 'Selecione a conta do Instagram.' }, { status: 400 });
    if (!mediaUrl) return NextResponse.json({ error: 'Envie a imagem ou vídeo do post.' }, { status: 400 });
    if (!scheduledAt) return NextResponse.json({ error: 'Defina a data e hora da publicação.' }, { status: 400 });
    if (mediaType !== 'POST' && mediaType !== 'REELS') return NextResponse.json({ error: 'Tipo de mídia inválido.' }, { status: 400 });

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!workspace) return NextResponse.json({ error: 'Workspace não encontrado.' }, { status: 404 });

    const { data: account } = await supabase
      .from('instagram_accounts')
      .select('id')
      .eq('id', instagramAccountId)
      .eq('workspace_id', workspace.id)
      .maybeSingle();

    if (!account) return NextResponse.json({ error: 'Conta do Instagram não encontrada.' }, { status: 404 });

    const { data: post, error } = await supabase
      .from('scheduled_posts')
      .insert({
        workspace_id: workspace.id,
        instagram_account_id: instagramAccountId,
        media_type: mediaType,
        caption: caption || null,
        media_url: mediaUrl,
        scheduled_at: new Date(scheduledAt).toISOString(),
        status: 'scheduled'
      })
      .select('*')
      .single();

    if (error) {
      if (/does not exist|relation/i.test(error.message)) {
        return NextResponse.json(
          { error: 'TABELA_AUSENTE', message: 'A tabela scheduled_posts ainda não existe no Supabase.' },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: error.message || 'Erro ao agendar o post.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, post });
  } catch (err: unknown) {
    console.error('Erro ao criar agendamento:', err);
    return NextResponse.json(
      { error: 'Erro interno: ' + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}
