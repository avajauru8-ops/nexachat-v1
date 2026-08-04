import { inngest } from './client';
import { createClient } from '@supabase/supabase-js';
import { publishPostToMeta, ScheduledPost } from '@/utils/schedulerService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Cron executado a cada minuto: publica todos os posts agendados
 * cuja data/hora já chegou (via Content Publishing API da Meta).
 */
export const publishScheduledPosts = inngest.createFunction(
  { id: 'publish-scheduled-posts', triggers: [{ cron: 'TZ=America/Sao_Paulo * * * * *' }] },
  async ({ step }) => {
    const due = await step.run('fetch-due-posts', async () => {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('status', 'scheduled')
        .lte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('[Scheduler] Erro ao buscar posts vencidos:', error.message);
        return [];
      }
      return (data as ScheduledPost[]) || [];
    });

    const results: { id: string; ok: boolean; error?: string }[] = [];

    for (const post of due) {
      const result = await step.run(`publish-${post.id}`, async () => {
        await supabase.from('scheduled_posts').update({ status: 'publishing' }).eq('id', post.id);

        try {
          const published = await publishPostToMeta(post);
          await supabase
            .from('scheduled_posts')
            .update({
              status: 'published',
              published_media_id: published.id,
              published_permalink: published.permalink,
              published_at: new Date().toISOString(),
              error: null
            })
            .eq('id', post.id);
          console.log(`[Scheduler] Post ${post.id} publicado com sucesso.`);
          return { id: post.id, ok: true };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          await supabase
            .from('scheduled_posts')
            .update({ status: 'failed', error: message })
            .eq('id', post.id);
          console.error(`[Scheduler] Falha ao publicar ${post.id}:`, message);
          return { id: post.id, ok: false, error: message };
        }
      });

      results.push(result);
    }

    return { checked: due.length, results };
  }
);
