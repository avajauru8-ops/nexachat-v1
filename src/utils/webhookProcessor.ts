import { createClient } from '@supabase/supabase-js';
import { inngest } from '@/inngest/client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function processMetaPayload(payload: any, initialWorkspaceId?: string | null) {
  if (!payload?.entry) return;

  for (const entry of payload.entry) {
    const entryId = entry.id;

    // --- 1. PROCESSAMENTO DE MENSAGENS DIRETAS (DMs) & STORIES ---
    if (entry.messaging && Array.isArray(entry.messaging)) {
      for (const webhookEvent of entry.messaging) {
        const senderId = webhookEvent.sender?.id;
        const recipientId = webhookEvent.recipient?.id || entryId;
        const msgObj = webhookEvent.message || {};
        const isEcho = Boolean(msgObj.is_echo);

        if (!senderId || isEcho) continue;

        const messageText = (msgObj.text || '').trim();
        let messageType = 'text';
        let mediaUrl: string | null = null;

        if (msgObj.attachments && msgObj.attachments.length > 0) {
          const attachment = msgObj.attachments[0];
          if (attachment.type === 'story_mention') messageType = 'story_mention';
          else if (attachment.type === 'image') messageType = 'image';
          else if (attachment.type === 'video') messageType = 'video';
          else if (attachment.type === 'audio') messageType = 'audio';
          if (attachment.payload?.url) mediaUrl = attachment.payload.url;
        }

        // Identificar Workspace e Conta do Instagram
        let { data: account } = await supabase
          .from('instagram_accounts')
          .select('id, workspace_id, access_token')
          .or(`ig_user_id.eq.${recipientId},page_id.eq.${recipientId}`)
          .limit(1)
          .maybeSingle();

        if (!account && initialWorkspaceId) {
          const { data: fallback } = await supabase
            .from('instagram_accounts')
            .select('id, workspace_id, access_token')
            .eq('workspace_id', initialWorkspaceId)
            .limit(1)
            .maybeSingle();
          account = fallback;
        }

        if (!account) {
          console.warn(`[Processamento Sync] Conta do Instagram não localizada para recipientId: ${recipientId}`);
          continue;
        }

        const activeWorkspaceId = account.workspace_id;

        // Identificar ou Criar Contato
        let { data: contact } = await supabase
          .from('contacts')
          .select('id, name')
          .eq('workspace_id', activeWorkspaceId)
          .eq('ig_scoped_id', senderId)
          .maybeSingle();

        if (!contact) {
          let contactName = 'Lead do Instagram';
          let contactUsername: string | null = null;
          let contactProfilePic: string | null = null;
          try {
            if (account.access_token) {
              const isMetaToken = account.access_token.startsWith('EAA');
              const domain = isMetaToken ? 'graph.facebook.com' : 'graph.instagram.com';
              const profileRes = await fetch(`https://${domain}/v22.0/${senderId}?fields=name,username,profile_pic&access_token=${account.access_token}`);
              const profileData = await profileRes.json();
              if (profileData.name || profileData.username) {
                contactName = profileData.name || profileData.username;
              }
              if (profileData.username) {
                contactUsername = profileData.username;
              }
              if (profileData.profile_pic) {
                contactProfilePic = profileData.profile_pic;
              }
            }
          } catch { /* ignora se falhar */ }

          const insertPayload: Record<string, any> = {
            workspace_id: activeWorkspaceId,
            instagram_account_id: account.id,
            ig_scoped_id: senderId,
            name: contactName,
            last_interaction_at: new Date().toISOString(),
            custom_fields: contactUsername ? { username: contactUsername } : {}
          };
          if (contactProfilePic) insertPayload.profile_picture = contactProfilePic;

          const { data: newC } = await supabase
            .from('contacts')
            .insert(insertPayload)
            .select('id, name')
            .single();
          contact = newC;
        }

        if (!contact) continue;

        // Atualizar last_interaction_at do contato
        await supabase.from('contacts').update({ last_interaction_at: new Date().toISOString() }).eq('id', contact.id);

        // Identificar ou Criar Conversa
        let { data: conversation } = await supabase
          .from('conversations')
          .select('id, status, window_expires_at, active_flow_id, flow_cursor, unread_count')
          .eq('workspace_id', activeWorkspaceId)
          .eq('contact_id', contact.id)
          .maybeSingle();

        const windowExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        if (!conversation) {
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({
              workspace_id: activeWorkspaceId,
              contact_id: contact.id,
              status: 'bot',
              last_interaction_at: new Date().toISOString(),
              window_expires_at: windowExpiresAt,
              unread_count: 1
            })
            .select('id, status, window_expires_at, active_flow_id, flow_cursor, unread_count')
            .single();
          conversation = newConv;
        } else {
          await supabase
            .from('conversations')
            .update({
              last_interaction_at: new Date().toISOString(),
              window_expires_at: windowExpiresAt,
              unread_count: (conversation.unread_count || 0) + 1
            })
            .eq('id', conversation.id);
        }

        if (!conversation) continue;

        // Inserir Mensagem na Tabela messages
        const { data: newMessage } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            sender_type: 'user',
            content: messageText,
            message_type: messageType,
            media_url: mediaUrl,
            direction: 'inbound',
            meta_message_id: msgObj.mid || `mid_${Date.now()}_${Math.random()}`
          })
          .select('id')
          .single();

        console.log(`[Processamento Sync] Mensagem salva com sucesso: ${newMessage?.id}`);

        // --- EXECUTAR AUTOMAÇÃO (IA OU FLUXO) ---
        if (conversation.status === 'ai') {
          await inngest.send({
            name: 'ai/process',
            data: {
              workspaceId: activeWorkspaceId,
              conversationId: conversation.id,
              contactId: contact.id,
              senderId: senderId,
              recipientId: recipientId,
              userMessageText: messageText
            }
          });
          console.log(`[Processamento Sync] Disparado evento AI para a conversa: ${conversation.id}`);
        } else if (conversation.status === 'bot' || conversation.status === 'bot_active') {
          let flowId = conversation.active_flow_id;
          let nodeId = conversation.flow_cursor?.currentNodeId || null;

          if (!flowId) {
            // Caso não tenha fluxo ativo preso no cursor, buscar o fluxo padrão ativo do workspace
            const { data: defaultFlow } = await supabase
              .from('flows')
              .select('id')
              .eq('workspace_id', activeWorkspaceId)
              .eq('is_active', true)
              .limit(1)
              .maybeSingle();
            
            if (defaultFlow) {
               flowId = defaultFlow.id;
            }
          }

          if (flowId) {
            await inngest.send({
              name: 'flow/execute',
              data: {
                workspaceId: activeWorkspaceId,
                contactId: contact.id,
                conversationId: conversation.id,
                recipientId: recipientId,
                senderId: senderId,
                flowId: flowId,
                nodeId: nodeId
              }
            });
            console.log(`[Processamento Sync] Disparado evento FLOW (${flowId}) para a conversa: ${conversation.id}`);
          }
        }
      }
    }
  }
}
