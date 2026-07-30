import { inngest } from './client'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const processBroadcast = inngest.createFunction(
  { id: 'process-broadcast-engine', triggers: [{ event: 'broadcast/send' }] },
  async ({ event, step }: { event: any, step: any }) => {
    const { workspaceId, tagId, messageText } = event.data;

    // 1. Fetch Instagram Account for this workspace to get Access Token
    const account = await step.run('fetch-ig-account', async () => {
      const { data } = await supabase
        .from('instagram_accounts')
        .select('ig_user_id, access_token')
        .eq('workspace_id', workspaceId)
        .single();
      return data;
    });

    if (!account) return { message: 'Conta do Instagram não encontrada para este Workspace.' };

    const pageAccessToken = account.access_token;
    const recipientId = account.ig_user_id; // Our page ID

    // 2. Fetch all contacts that have this tag
    const contacts = await step.run('fetch-tagged-contacts', async () => {
      const { data } = await supabase
        .from('contact_tags')
        .select(`
          contact_id,
          contacts (
            ig_scoped_id
          )
        `)
        .eq('tag_id', tagId);
      
      return data || [];
    });

    if (contacts.length === 0) return { message: 'Nenhum contato encontrado com esta tag.' };

    // 3. Loop and send messages (Batching logic can be added here)
    // We send in parallel but cap concurrency to respect Meta limits.
    // For a simple SaaS MVP, sequential or small batches is safer.
    await step.run('send-messages-to-audience', async () => {
      let sentCount = 0;
      let errorCount = 0;

      for (const ct of contacts) {
        const contactData = ct.contacts as any;
        if (!contactData || !contactData.ig_scoped_id) continue;

        const senderId = contactData.ig_scoped_id; // The user's ID

        const metaUrl = `https://graph.facebook.com/v19.0/${recipientId}/messages`;
        const metaBody = {
          recipient: { id: senderId },
          message: { text: messageText },
          messaging_type: 'MESSAGE_TAG', // Required for sending outside 24h window (in some cases)
          tag: 'POST_PURCHASE_UPDATE' // Just an example tag, Meta rules apply in real life
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

          if (metaRes.ok) {
            sentCount++;
          } else {
            const err = await metaRes.json();
            console.error('Meta API Error on Broadcast:', err);
            errorCount++;
          }
        } catch (e) {
          console.error('Fetch Error on Broadcast:', e);
          errorCount++;
        }

        // Small delay to prevent hitting Meta API rate limits (e.g. 50 requests per second)
        // 100ms means 10 requests per sec.
        await new Promise(r => setTimeout(r, 100)); 
      }

      console.log(`Broadcast finalizado. Sucesso: ${sentCount}, Erros: ${errorCount}`);
      return { sentCount, errorCount };
    });

    return { message: 'Broadcast processado com sucesso' };
  }
);
