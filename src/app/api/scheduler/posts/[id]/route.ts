import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { publishPostToMeta, ScheduledPost, isTransientMetaError, MAX_ATTEMPTS } from '@/utils/schedulerService';

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

    await supabase
      .from('scheduled_posts')
      .update({ status: 'publishing', updated_at: new Date().toISOString() })
      .eq('id', id);

    try {
      const published = await publishPostToMeta(post as ScheduledPost);
      await supabase
        .from('scheduled_posts')
        .update({
          status: 'published',
          published_media_id: published.id,
          published_permalink: published.permalink,
          published_at: new Date().toISOString(),
          error: null,
          last_error: null,
          last_error_at: null,
          attempts: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      return NextResponse.json({ success: true, post: { ...post, status: 'published', ...published } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const transient = isTransientMetaError(err) || err instanceof TypeError;
      const attempts = (post.attempts ?? 0) + 1;

      if (transient && attempts < MAX_ATTEMPTS) {
        await supabase
          .from('scheduled_posts')
          .update({
            status: 'scheduled',
            attempts,
            last_error: message,
            last_error_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
        return NextResponse.json(
          {
            error: message,
            retry: true,
            message: `Não foi possível publicar agora (${message}). O post continua agendado e será tentado automaticamente de novo.`
          },
          { status: 429 }
        );
      }

      await supabase
        .from('scheduled_posts')
        .update({
          status: 'failed',
          attempts,
          error: message,
          last_error: message,
          last_error_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (err: unknown) {
    return NextResponse.json(
      { error: 'Erro interno: ' + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}
