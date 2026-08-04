import { inngest } from './client';
import { createClient } from '@supabase/supabase-js';
import {
  publishPostToMeta,
  ScheduledPost,
  isTransientMetaError,
  MAX_ATTEMPTS,
  RETRY_BACKOFF_MS
} from '@/utils/schedulerService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Cron executado a cada minuto: publica todos os posts agendados
 * cuja data/hora já chegou (via Content Publishing API da Meta).
 *
 * Erros transientes (limite de requisições, vídeo ainda processando, timeout)
 * NÃO marcam o post como falho: ele permanece agendado e é tentado de novo
 * com backoff de 15 minutos, até MAX_ATTEMPTS tentativas.
 */
export const publishScheduledPosts = inngest.createFunction(
  { id: 'publish-scheduled-posts', triggers: [{ cron: 'TZ=America/Sao_Paulo * * * * *' }] },
  async ({ step }) => {
    const nowIso = () => new Date().toISOString();

    const due = await step.run('fetch-due-posts', async () => {
      // 1. Recupera posts presos em "publishing" (processo morreu no meio da publicação)
      try {
        const { data: stuck } = await supabase
          .from('scheduled_posts')
          .select('id, attempts')
          .eq('status', 'publishing')
          .lt('updated_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
          .limit(50);

        if (stuck?.length) {
          for (const s of stuck) {
            const { error } = await supabase
              .from('scheduled_posts')
              .update({
                status: 'scheduled',
                attempts: (s.attempts ?? 0) + 1,
                last_error: 'Publicação interrompida — será tentada novamente.',
                last_error_at: nowIso(),
                updated_at: nowIso()
              })
              .eq('id', s.id);
            if (error) console.warn(`[Scheduler] Erro ao resgatar post ${s.id}:`, error.message);
          }
        }
      } catch (err) {
        console.warn('[Scheduler] Falha no resgate de posts presos:', err);
      }

      // 2. Posts agendados e vencidos, com backoff após erro transiente
      const backoffBefore = new Date(Date.now() - RETRY_BACKOFF_MS).toISOString();
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('status', 'scheduled')
        .lte('scheduled_at', nowIso())
        .or(`last_error_at.is.null,last_error_at.lte.${backoffBefore}`)
        .order('scheduled_at', { ascending: true })
        .limit(50);

      if (error) {
        // Tabela sem as colunas de retry (migração não aplicada) → consulta simples
        if (/does not exist/i.test(error.message)) {
          console.warn('[Scheduler] Colunas de retry ausentes — rode supabase/migrations/20260804_scheduler_retry.sql');
          const { data: d2 } = await supabase
            .from('scheduled_posts')
            .select('*')
            .eq('status', 'scheduled')
            .lte('scheduled_at', nowIso())
            .order('scheduled_at', { ascending: true })
            .limit(50);
          return (d2 as ScheduledPost[]) || [];
        }
        console.error('[Scheduler] Erro ao buscar posts vencidos:', error.message);
        return [];
      }
      return (data as ScheduledPost[]) || [];
    });

    const results: { id: string; ok: boolean; error?: string; retry?: boolean }[] = [];

    for (const post of due) {
      const result = await step.run(`publish-${post.id}`, async () => {
        await supabase
          .from('scheduled_posts')
          .update({ status: 'publishing', updated_at: nowIso() })
          .eq('id', post.id);

        try {
          const published = await publishPostToMeta(post);
          await supabase
            .from('scheduled_posts')
            .update({
              status: 'published',
              published_media_id: published.id,
              published_permalink: published.permalink,
              published_at: nowIso(),
              error: null,
              last_error: null,
              last_error_at: null,
              attempts: 0,
              updated_at: nowIso()
            })
            .eq('id', post.id);
          console.log(`[Scheduler] Post ${post.id} publicado com sucesso.`);
          return { id: post.id, ok: true };
        } catch (err) {
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
                last_error_at: nowIso(),
                updated_at: nowIso()
              })
              .eq('id', post.id);
            console.warn(`[Scheduler] Erro transiente em ${post.id} (${attempts}/${MAX_ATTEMPTS}): ${message}`);
            return { id: post.id, ok: false, error: message, retry: true };
          }

          await supabase
            .from('scheduled_posts')
            .update({
              status: 'failed',
              attempts,
              error: message,
              last_error: message,
              last_error_at: nowIso(),
              updated_at: nowIso()
            })
            .eq('id', post.id);
          console.error(`[Scheduler] Falha ao publicar ${post.id}: ${message}`);
          return { id: post.id, ok: false, error: message };
        }
      });

      results.push(result);
    }

    return { checked: due.length, results };
  }
);
