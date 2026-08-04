import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ScheduledPost {
  id: string;
  workspace_id: string;
  instagram_account_id: string;
  media_type: 'POST' | 'REELS';
  caption: string | null;
  media_url: string | null;
  scheduled_at: string;
  status: 'scheduled' | 'publishing' | 'published' | 'failed';
  error: string | null;
  published_media_id: string | null;
  published_permalink: string | null;
  published_at: string | null;
  created_at: string;
}

export const graphHostFor = (token: string) =>
  token.startsWith('EAA') ? 'graph.facebook.com' : 'graph.instagram.com';

/**
 * Publica um post/reels agendado na conta do Instagram usando a
 * Content Publishing API da Meta (POST /{ig_user_id}/media -> media_publish).
 * Requer a permissão "instagram_content_publish" na app Meta.
 */
export async function publishPostToMeta(post: ScheduledPost) {
  const { data: account } = await supabaseAdmin
    .from('instagram_accounts')
    .select('ig_user_id, access_token')
    .eq('id', post.instagram_account_id)
    .maybeSingle();

  if (!account?.access_token || !account.ig_user_id) {
    throw new Error('Conta do Instagram não encontrada ou sem token válido.');
  }
  if (!post.media_url) {
    throw new Error('Post sem mídia — faça o upload novamente.');
  }

  const host = graphHostFor(account.access_token);
  const base = `https://${host}/v22.0/${account.ig_user_id}`;
  const headers = {
    'Authorization': `Bearer ${account.access_token}`,
    'Content-Type': 'application/json'
  };

  const isReels = post.media_type === 'REELS';
  const looksVideo = /\.(mp4|mov|m4v|webm)(\?|$)/i.test(post.media_url);

  const containerBody: Record<string, unknown> = {
    caption: post.caption || '',
    is_reusable: true
  };

  if (isReels) {
    containerBody.media_type = 'REELS';
    containerBody.video_url = post.media_url;
    containerBody.share_to_feed = true;
  } else if (looksVideo) {
    containerBody.media_type = 'VIDEO';
    containerBody.video_url = post.media_url;
  } else {
    containerBody.image_url = post.media_url;
  }

  const containerRes = await fetch(`${base}/media`, {
    method: 'POST',
    headers,
    body: JSON.stringify(containerBody)
  });
  const containerData = await containerRes.json();

  if (containerData.error || !containerData.id) {
    throw new Error(containerData.error?.message || 'Falha ao criar o container da mídia.');
  }

  const publishRes = await fetch(`${base}/media_publish`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ creation_id: containerData.id })
  });
  const publishData = await publishRes.json();

  if (publishData.error || !publishData.id) {
    throw new Error(publishData.error?.message || 'Falha ao publicar o conteúdo.');
  }

  return { id: publishData.id, permalink: publishData.permalink || null };
}
