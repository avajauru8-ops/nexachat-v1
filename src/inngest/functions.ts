import { inngest } from './client';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const processWebhookEvent = inngest.createFunction(
  { id: 'process-instagram-webhook-event', triggers: [{ event: 'instagram/event.received' }] },
  async ({ event, step }) => {
    const { eventId, workspaceId: initialWorkspaceId, payload } = event.data;

    await step.run('process-meta-payload', async () => {
      console.log(`[Inngest Router] Processando evento Meta (EventLog ID: ${eventId})`);
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
              console.warn(`[Inngest Router] Conta do Instagram não localizada para recipientId: ${recipientId}`);
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
                  const profileRes = await fetch(`https://graph.instagram.com/v22.0/${senderId}?fields=name,username,profile_picture_url&access_token=${account.access_token}`);
                  const profileData = await profileRes.json();
                  if (profileData.name || profileData.username) {
                    contactName = profileData.name || profileData.username;
                  }
                  if (profileData.username) {
                    contactUsername = profileData.username;
                  }
                  if (profileData.profile_picture_url) {
                    contactProfilePic = profileData.profile_picture_url;
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
              .select('id, status, window_expires_at')
              .eq('workspace_id', activeWorkspaceId)
              .eq('contact_id', contact.id)
              .maybeSingle();

            // Calcular expiração da Janela de 24 horas da Meta
            const windowExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

            if (!conversation) {
              const { data: newConv } = await supabase
                .from('conversations')
                .insert({
                  workspace_id: activeWorkspaceId,
                  contact_id: contact.id,
                  status: 'bot',
                  last_interaction_at: new Date().toISOString(),
                  window_expires_at: windowExpiresAt
                })
                .select('id, status, window_expires_at')
                .single();
              conversation = newConv;
            } else {
              // Renovar a janela de 24h a cada mensagem de entrada do usuário
              await supabase
                .from('conversations')
                .update({
                  last_interaction_at: new Date().toISOString(),
                  window_expires_at: windowExpiresAt
                })
                .eq('id', conversation.id);
            }

            if (!conversation) continue;

            // Inserir mensagem recebida no banco (dispara Realtime para o Inbox)
            const fallbackContent = messageText || (messageType === 'image' ? '📷 Foto' : messageType === 'video' ? '🎥 Vídeo' : 'Mensagem enviada');
            await supabase.from('messages').insert({
              conversation_id: conversation.id,
              sender_type: 'user',
              message_type: messageType,
              content: fallbackContent,
              media_url: mediaUrl,
              meta_message_id: msgObj.mid || null
            });

            // --- ROTEAMENTO POR STATUS DA CONVERSA ---
            
            // 1. Status 'human': Atendimento assumido por humano — apenas salva mensagem, não dispara bot/IA
            if (conversation.status === 'human' || conversation.status === 'paused_for_human') {
              console.log(`[Inngest Router] Conversa ${conversation.id} está no modo HUMANO. Bot/IA ignorados.`);
              continue;
            }

            // 2. Status 'ai': Encaminha para o Agente de IA (LLM + RAG + Handoff)
            if (conversation.status === 'ai') {
              console.log(`[Inngest Router] Conversa ${conversation.id} está no modo IA. Encaminhando para ai/process...`);
              await inngest.send({
                name: 'ai/process',
                data: {
                  workspaceId: activeWorkspaceId,
                  conversationId: conversation.id,
                  contactId: contact.id,
                  senderId,
                  recipientId,
                  userMessageText: messageText
                }
              });
              continue;
            }

            // 3. Status 'bot' / 'bot_active': Executa Engine de Fluxos
            if (conversation.status === 'bot' || conversation.status === 'bot_active') {
              const { data: flows } = await supabase
                .from('flows')
                .select('id, graph_json, flow_data, triggers')
                .eq('workspace_id', activeWorkspaceId)
                .in('status', ['published', 'active']);

              if (flows && flows.length > 0) {
                for (const flow of flows) {
                  const graphData = flow.graph_json || flow.flow_data || {};
                  const nodes = graphData.nodes || [];
                  const edges = graphData.edges || [];

                  const triggerNode = nodes.find((n: Record<string, unknown>) => n.type === 'triggerNode' || n.type === 'trigger');
                  if (!triggerNode) continue;

                  const triggerKeyword = (triggerNode.data?.keyword || flow.triggers?.keyword || '').trim().toLowerCase();

                  let matches = false;
                  if (!triggerKeyword || messageText.toLowerCase().includes(triggerKeyword)) {
                    matches = true;
                  }

                  if (matches) {
                    console.log(`[Inngest Router] Gatilho "${triggerKeyword || 'coringa'}" ativado para o fluxo "${flow.id}"`);

                    const outgoingEdge = edges.find((e: Record<string, unknown>) => e.source === triggerNode.id);
                    if (outgoingEdge) {
                      // Omitindo flow_cursor e active_flow_id pois colunas podem não existir na v1

                      // Disparar execução assíncrona do fluxo
                      await inngest.send({
                        name: 'flow/execute',
                        data: {
                          workspaceId: activeWorkspaceId,
                          contactId: contact.id,
                          conversationId: conversation.id,
                          recipientId,
                          senderId,
                          flowId: flow.id,
                          nodeId: outgoingEdge.target
                        }
                      });

                      // Interrompe verificação após casar o primeiro fluxo
                      break;
                    }
                  }
                }
              }
            }
          }
        }

        // --- 2. PROCESSAMENTO DE COMENTÁRIOS (COMMENT-TO-DM) ---
        if (entry.changes && Array.isArray(entry.changes)) {
          for (const change of entry.changes) {
            if (change.value?.item === 'comment' && change.value?.text) {
              const senderId = change.value.from?.id;
              const commentText = change.value.text;

              console.log(`[Inngest Router] Novo comentário de ${senderId}: "${commentText}"`);
              // Processamento de Comment-to-DM pode ser disparado aqui se houver fluxo com trigger_type = 'comment_keyword'
            }
          }
        }
      }
    });

    // Atualizar registro de log como processado
    if (eventId) {
      await step.run('mark-log-processed', async () => {
        await supabase
          .from('events_log')
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq('id', eventId);
      });
    }

    return { message: 'Evento roteado e processado com sucesso' };
  }
);

// Re-exporta a função do Agente de IA para ser registrada junto no endpoint do Inngest
export { processAiAgent } from './aiAgentEngine';
