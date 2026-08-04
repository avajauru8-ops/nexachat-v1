import { inngest } from './client'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const processBroadcast = inngest.createFunction(
  { id: 'process-broadcast-engine', triggers: [{ event: 'broadcast/send' }] },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async ({ event, step }: { event: any, step: any }) => {
    const { workspaceId, tagId, messageText } = event.data;

    // 1. Buscar a conta do Instagram do workspace (token de acesso)
    const account = await step.run('fetch-ig-account', async () => {
      const { data } = await supabase
        .from('instagram_accounts')
        .select('ig_user_id, access_token')
        .eq('workspace_id', workspaceId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      return data;
    });

    if (!account) return { message: 'Conta do Instagram não encontrada para este Workspace.' };

    const pageAccessToken = account.access_token;

    // 2. Buscar todos os contatos que possuem esta tag + a janela de 24h das conversas
    const contacts = await step.run('fetch-tagged-contacts', async () => {
      const { data } = await supabase
        .from('contact_tags')
        .select(`
          contact_id,
          contacts (
            ig_scoped_id,
            conversations (
              window_expires_at
            )
          )
        `)
        .eq('tag_id', tagId);

      return data || [];
    });

    if (contacts.length === 0) return { message: 'Nenhum contato encontrado com esta tag.' };

    // 3. Loop de envio respeitando a janela de 24h do Instagram
    const result = await step.run('send-messages-to-audience', async () => {
      let sentCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      const now = Date.now();

      for (const ct of contacts) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contactData: any = Array.isArray(ct.contacts) ? ct.contacts[0] : ct.contacts;
        if (!contactData || !contactData.ig_scoped_id) continue;

        const senderId = contactData.ig_scoped_id;

        // Instagram só permite DM dentro da janela de 24h desde a última interação
        const conv = Array.isArray(contactData.conversations) ? contactData.conversations[0] : contactData.conversations;
        const windowExpires = conv?.window_expires_at ? new Date(conv.window_expires_at).getTime() : 0;

        if (windowExpires <= now) {
          skippedCount++;
          console.log(`[Broadcast] Pulado (janela 24h expirada): ${senderId}`);
          continue;
        }

        const metaUrl = `https://graph.instagram.com/v22.0/me/messages`;
        const metaBody = {
          recipient: { id: senderId },
          message: { text: messageText }
        };

        try {
          const metaRes = await fetch(metaUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${pageAccessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(metaBody)
          });

          if (!metaRes.ok) {
            const err = await metaRes.json();
            console.error('[Broadcast] Meta API Error:', err.error?.message || err);
            errorCount++;
            await new Promise(r => setTimeout(r, 100));
            continue;
          }

          sentCount++;

          // Salvar a mensagem no banco para aparecer no Inbox (dedupe por meta_message_id)
          const messageId = `broadcast_${workspaceId}_${senderId}_${Date.now()}`;
          await supabase
            .from('messages')
            .insert({
              conversation_id: conv?.id,
              sender_type: 'bot',
              message_type: 'text',
              content: messageText,
              direction: 'outbound',
              meta_message_id: messageId
            });

          // Atualizar a conversa (nova janela de 24h a partir do envio)
          if (conv?.id) {
            await supabase
              .from('conversations')
              .update({
                last_interaction_at: new Date().toISOString(),
                window_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
              })
              .eq('id', conv.id);
          }
        } catch (e) {
          console.error('[Broadcast] Fetch Error:', e);
          errorCount++;
        }

        // Pequeno delay para respeitar o rate limit da Meta (10 req/s)
        await new Promise(r => setTimeout(r, 100));
      }

      console.log(`[Broadcast] Finalizado. Enviados: ${sentCount}, Pulados: ${skippedCount}, Erros: ${errorCount}`);
      return { sentCount, skippedCount, errorCount };
    });

    return { message: 'Broadcast processado com sucesso', ...result };
  }
);
