import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { publishPostToMeta, ScheduledPost } from '@/utils/schedulerService';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const { data: workspace } = await supabase.from('workspaces').select('id').eq('user_id', user.id).single();
    if (!workspace) return NextResponse.json({ error: 'Workspace não encontrado.' }, { status: 404 });

    const { error } = await supabase
      .from('scheduled_posts')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspace.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: 'Erro interno: ' + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const { data: workspace } = await supabase.from('workspaces').select('id').eq('user_id', user.id).single();
    if (!workspace) return NextResponse.json({ error: 'Workspace não encontrado.' }, { status: 404 });

    const { data: post, error: fetchError } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspace.id)
      .maybeSingle();

    if (fetchError || !post) return NextResponse.json({ error: 'Agendamento não encontrado.' }, { status: 404 });
    if (post.status === 'published' || post.status === 'publishing') {
      return NextResponse.json({ error: 'Este post já foi publicado ou está sendo publicado.' }, { status: 400 });
    }

    await supabase.from('scheduled_posts').update({ status: 'publishing' }).eq('id', id);

    try {
      const published = await publishPostToMeta(post as ScheduledPost);
      await supabase
        .from('scheduled_posts')
        .update({
          status: 'published',
          published_media_id: published.id,
          published_permalink: published.permalink,
          published_at: new Date().toISOString(),
          error: null
        })
        .eq('id', id);

      return NextResponse.json({ success: true, post: { ...post, status: 'published', ...published } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await supabase.from('scheduled_posts').update({ status: 'failed', error: message }).eq('id', id);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (err: unknown) {
    return NextResponse.json(
      { error: 'Erro interno: ' + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}
