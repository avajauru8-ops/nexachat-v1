import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
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
  attempts?: number | null;
  last_error?: string | null;
  last_error_at?: string | null;
  updated_at?: string | null;
}

export const MAX_ATTEMPTS = 5;
export const RETRY_BACKOFF_MS = 15 * 60 * 1000;

export const graphHostFor = (token: string) =>
  token.startsWith('EAA') ? 'graph.facebook.com' : 'graph.instagram.com';

/**
 * Erro transiente da API da Meta: pode ser tentado novamente depois
 * (limite de requisições, processamento de vídeo, timeout, 5xx...).
 */
export class MetaTransientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MetaTransientError';
  }
}

const TRANSIENT_PATTERN =
  /request limit|rate limit|too many|processing|in progress|still being processed|timeout|timed out|temporarily|unavailable|try again|server error|connection/i;

export function isTransientMetaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return TRANSIENT_PATTERN.test(message);
}

/**
 * Publica um post/reels agendado na conta do Instagram usando a
 * Content Publishing API da Meta (POST /{ig_user_id}/media -> media_publish).
 * Requer a permissão "instagram_content_publish" na app Meta.
 */
export async function publishPostToMeta(post: ScheduledPost) {
  const supabaseAdmin = getSupabaseAdmin();
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
  let containerData: { id?: string; error?: { message?: string; code?: number } } = {};
  try {
    containerData = await containerRes.json();
  } catch {
    containerData = { error: { message: `Falha de comunicação com a Meta (HTTP ${containerRes.status})` } };
  }

  if (!containerRes.ok || containerData.error || !containerData.id) {
    const message = containerData.error?.message || `Falha ao criar o container da mídia (HTTP ${containerRes.status})`;
    if (!containerRes.ok || isTransientMetaError(message)) throw new MetaTransientError(message);
    throw new Error(message);
  }

  const publishRes = await fetch(`${base}/media_publish`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ creation_id: containerData.id })
  });
  let publishData: { id?: string; permalink?: string | null; error?: { message?: string } } = {};
  try {
    publishData = await publishRes.json();
  } catch {
    publishData = { error: { message: `Falha de comunicação com a Meta (HTTP ${publishRes.status})` } };
  }

  if (!publishRes.ok || publishData.error || !publishData.id) {
    const message = publishData.error?.message || `Falha ao publicar o conteúdo (HTTP ${publishRes.status})`;
    if (!publishRes.ok || isTransientMetaError(message)) throw new MetaTransientError(message);
    throw new Error(message);
  }

  return { id: publishData.id, permalink: publishData.permalink || null };
}
