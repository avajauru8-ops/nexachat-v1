import { createClient } from '@supabase/supabase-js';
import { inngest } from '@/inngest/client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Avalia a lista de fluxos ativos e retorna o flowId do primeiro que der match 
 * com o tipo de evento (triggerType) e o conteúdo recebido (incomingText).
 */
function matchActiveFlow(
  activeFlows: any[],
  triggerType: string,
  incomingText: string = '',
  mediaId: string | null = null
): string | null {
  if (!activeFlows || activeFlows.length === 0) return null;

  const normalizedText = incomingText.trim().toLowerCase();

  for (const flow of activeFlows) {
    if (flow.trigger_type === triggerType) {
      
      // Checagem de mídia específica (para comentários)
      if (triggerType === 'comment_keyword' && mediaId) {
        const specificMediaId = ((flow.triggers as Record<string, unknown>)?.specificMediaId as string | undefined) || ((flow.trigger_config as Record<string, unknown>)?.specificMediaId as string | undefined);
        if (specificMediaId && specificMediaId !== 'all' && specificMediaId !== mediaId) {
          continue; // Ignora este fluxo, pois o comentário foi em um post diferente
        }
      }

      // Se o gatilho não exige palavra-chave específica (ex: welcome_dm, ou comment_keyword genérico)
      let hasKeywordLogic = false;
      const keywords: string[] = [];
      
      if (flow.triggers && (flow.triggers as Record<string, unknown>).keyword) {
        hasKeywordLogic = true;
        const kw = (flow.triggers as Record<string, unknown>).keyword;
        if (Array.isArray(kw)) keywords.push(...kw);
        else keywords.push(String(kw));
      }
      if (flow.trigger_config && (flow.trigger_config as Record<string, unknown>).keywords) {
        hasKeywordLogic = true;
        keywords.push(...((flow.trigger_config as Record<string, unknown>).keywords as string[]));
      }

      if (!hasKeywordLogic || keywords.length === 0) {
        // Fluxo sem palavra-chave configurada (ex: aceita qualquer reply, ou welcome_dm)
        return flow.id;
      }

      // Verifica se alguma palavra-chave configurada bate com o texto recebido
      const match = keywords.find((kw: string) => {
        const kwNorm = kw.trim().toLowerCase();
        return kwNorm.length > 0 && normalizedText.includes(kwNorm);
      });

      if (match) {
        return flow.id;
      }
    }
  }

  return null;
}

async function logFlowExecution(workspaceId: string, flowId: string, contact: any, triggerType: string, keywordMatched: string = '') {
  try {
    const leadUsername = contact.custom_fields?.username || contact.name || 'Lead';
    await supabase.from('flow_logs').insert({
      workspace_id: workspaceId,
      flow_id: flowId,
      lead_username: leadUsername,
      trigger_type: triggerType,
      keyword_matched: keywordMatched
    });
  } catch (err) {
    console.error("Error logging flow execution", err);
  }
}

async function dispatchFlowExecution(params: {
  workspaceId: string;
  contactId: string;
  conversationId: string;
  recipientId: string;
  senderId: string;
  flowId: string;
  nodeId: string | null;
  commentId?: string;
}) {
  const { workspaceId, contactId, conversationId, recipientId, senderId, flowId, nodeId, commentId } = params;
  try {
    if (process.env.INNGEST_EVENT_KEY) {
      await inngest.send({
        name: 'flow/execute',
        data: {
          workspaceId,
          contactId,
          conversationId,
          recipientId,
          senderId,
          flowId,
          nodeId,
          commentId
        }
      });
      console.log(`[Seguidores] Disparado evento FLOW (${flowId}) para a conversa: ${conversationId}`);
    } else {
      throw new Error("INNGEST_EVENT_KEY ausente");
    }
  } catch (inngestErr) {
    console.warn(`[Seguidores] Fallback para execução síncrona devido a falha no Inngest: ${inngestErr}`);
    const { executeFlowDirect } = await import('@/utils/flowEngineDirect');
    try {
      await executeFlowDirect({
        workspaceId,
        contactId,
        conversationId,
        recipientId,
        senderId,
        flowId,
        nodeId,
        commentId
      });
    } catch (e) {
      console.error("[Flow Engine Direct] Erro no fallback:", e);
    }
  }
}

/**
 * Cria ou recupera o contato e a conversa associada para o evento atual
 */
async function getOrCreateContactAndConversation(
  activeWorkspaceId: string,
  account: any,
  senderId: string,
  channel: 'dm' | 'comment' | 'story' = 'dm',
  opts: { markUnread?: boolean; username?: string | null } = {}
) {
  const markUnread = opts.markUnread !== false;

  // Identificar ou Criar Contato
  let { data: contact } = await supabase
    .from('contacts')
    .select('id, name, custom_fields')
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

    if (opts.username && !contactUsername) {
      contactUsername = opts.username;
    }
    if (!contactName || contactName === 'Lead do Instagram') {
      contactName = contactUsername || contactName;
    }

    const insertPayload: Record<string, any> = {
      workspace_id: activeWorkspaceId,
      instagram_account_id: account.id,
      ig_scoped_id: senderId,
      name: contactName,
      last_interaction_at: new Date().toISOString(),
      username: contactUsername,
      custom_fields: contactUsername ? { username: contactUsername } : {}
    };
    if (contactProfilePic) insertPayload.profile_picture = contactProfilePic;

    const { data: newC } = await supabase
      .from('contacts')
      .insert(insertPayload)
      .select('id, name, custom_fields')
      .single();
    contact = newC;
  }

  if (!contact) return { contact: null, conversation: null, created: false };

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

  let created = false;

  if (!conversation) {
    created = true;
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        workspace_id: activeWorkspaceId,
        contact_id: contact.id,
        status: 'bot',
        channel,
        last_interaction_at: new Date().toISOString(),
        window_expires_at: windowExpiresAt,
        unread_count: markUnread ? 1 : 0
      })
      .select('id, status, window_expires_at, active_flow_id, flow_cursor, unread_count')
      .single();
    conversation = newConv;

    // Se é uma conversa inteiramente nova, vamos checar se existe fluxo welcome_dm
    const { data: activeFlows } = await supabase
      .from('flows')
      .select('id, trigger_type, trigger_config, triggers')
      .eq('workspace_id', activeWorkspaceId)
      .in('status', ['active', 'published']);
      
    const welcomeFlowId = matchActiveFlow(activeFlows || [], 'welcome_dm', '');
    if (welcomeFlowId && conversation) {
      conversation.active_flow_id = welcomeFlowId;
      await supabase.from('conversations').update({ active_flow_id: welcomeFlowId }).eq('id', conversation.id);
      await logFlowExecution(activeWorkspaceId, welcomeFlowId, contact, 'welcome_dm', '');
    }
  } else {
    await supabase
      .from('conversations')
      .update({
        last_interaction_at: new Date().toISOString(),
        window_expires_at: windowExpiresAt,
        unread_count: (conversation.unread_count || 0) + (markUnread ? 1 : 0)
      })
      .eq('id', conversation.id);
  }

  return { contact, conversation, created };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function processMetaPayload(payload: any, initialWorkspaceId?: string | null) {
  if (!payload?.entry) return;

  for (const entry of payload.entry) {
    const entryId = entry.id;

    // --- 1. PROCESSAMENTO DE MENSAGENS DIRETAS (DMs) & STORIES ---
    if (entry.messaging && Array.isArray(entry.messaging)) {
      for (const webhookEvent of entry.messaging) {
        const senderId = webhookEvent.sender?.id;
        const recipientId = webhookEvent.recipient?.id || entryId;
        if (!webhookEvent.message && !webhookEvent.postback) continue;

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
          else if (attachment.type === 'share') messageType = 'share';
          
          if (attachment.payload?.url) mediaUrl = attachment.payload.url;
        }

        // Verifica se é uma resposta a um story
        if (msgObj.reply_to && msgObj.reply_to.story) {
          messageType = 'story_reply';
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

        const convChannel: 'dm' | 'comment' | 'story' =
          messageType === 'story_mention' || messageType === 'story_reply' ? 'story' : 'dm';

        const { contact, conversation } = await getOrCreateContactAndConversation(activeWorkspaceId, account, senderId, convChannel);
        
        if (!contact || !conversation) continue;

        // Contexto do post/story para a citação (quote) no Inbox
        const isStory = messageType === 'story_mention' || messageType === 'story_reply';
        const messageMetadata = isStory
          ? { post_url: mediaUrl, story: true }
          : {};

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
            metadata: messageMetadata,
            meta_message_id: msgObj.mid || `mid_${Date.now()}_${Math.random()}`
          })
          .select('id')
          .single();

        console.log(`[Processamento Sync] Mensagem salva com sucesso: ${newMessage?.id}`);

        // --- EXECUTAR AUTOMAÇÃO (IA OU FLUXO) ---
        if (conversation.status === 'ai') {
          try {
            if (process.env.INNGEST_EVENT_KEY) {
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
            } else {
              throw new Error("INNGEST_EVENT_KEY ausente");
            }
          } catch (aiErr) {
            console.warn(`[Processamento Sync] Fallback síncrono para AI devido a falha no Inngest: ${aiErr}`);
            const { executeAiDirect } = await import('@/utils/aiEngineDirect');
            try {
              await executeAiDirect({
                workspaceId: activeWorkspaceId,
                conversationId: conversation.id,
                senderId: senderId,
                userMessageText: messageText
              });
            } catch (err) {
              console.error(`[Processamento Sync] Erro no executeAiDirect:`, err);
            }
          }
        } else if (conversation.status === 'bot' || conversation.status === 'bot_active') {
          let flowId = conversation.active_flow_id;
          const nodeId = conversation.flow_cursor?.currentNodeId || null;

          // Se não há um cursor ativo, significa que a automação anterior terminou ou travou.
          // Devemos limpar o flowId para forçar a avaliação de novas palavras-chave.
          // Exceção: fluxos de boas-vindas atribuídos mas ainda não iniciados (sem cursor) devem executar.
          if (!nodeId) {
            if (flowId) {
              const { data: assignedFlow } = await supabase
                .from('flows')
                .select('trigger_type')
                .eq('id', flowId)
                .maybeSingle();
              if (!assignedFlow || assignedFlow.trigger_type !== 'welcome_dm') {
                flowId = null;
              }
            } else {
              flowId = null;
            }
          }

          if (!flowId) {
            // Buscar todos os fluxos ativos deste workspace
            const { data: activeFlows } = await supabase
              .from('flows')
              .select('id, trigger_type, trigger_config, triggers')
              .eq('workspace_id', activeWorkspaceId)
              .in('status', ['active', 'published']); // Alguns podem estar salvos como 'published'
            
            if (activeFlows && activeFlows.length > 0) {
              const incomingText = (messageText || '').trim().toLowerCase();
              
              // Determina o tipo do gatilho baseado no evento da mensagem
              let currentTriggerType = 'dm_keyword';
              if (messageType === 'story_mention') currentTriggerType = 'story_mention';
              else if (messageType === 'story_reply') currentTriggerType = 'story_reply';
              
              const matchedFlowId = matchActiveFlow(activeFlows, currentTriggerType, incomingText);
              
              if (matchedFlowId) {
                flowId = matchedFlowId;
                
                await supabase
                  .from('conversations')
                  .update({ active_flow_id: flowId })
                  .eq('id', conversation.id);

                await logFlowExecution(activeWorkspaceId, flowId, contact, currentTriggerType, incomingText);
              }
            }
          }

          if (flowId) {
            try {
              if (process.env.INNGEST_EVENT_KEY) {
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
              } else {
                throw new Error("INNGEST_EVENT_KEY ausente");
              }
            } catch (inngestErr) {
              console.warn(`[Processamento Sync] Fallback para execução síncrona devido a falha no Inngest: ${inngestErr}`);
              const { executeFlowDirect } = await import('@/utils/flowEngineDirect');
              try {
                // Await is necessary so waitUntil keeps the function alive
                await executeFlowDirect({
                  workspaceId: activeWorkspaceId,
                  contactId: contact.id,
                  conversationId: conversation.id,
                  recipientId: recipientId,
                  senderId: senderId,
                  flowId: flowId,
                  nodeId: nodeId
                });
              } catch (e) {
                console.error("[Flow Engine Direct] Erro no fallback:", e);
              }
            }
          }
        }
      }
    }

    // --- 2. PROCESSAMENTO DE EVENTOS DIVERSOS (CHANGES) COMO COMENTÁRIOS ---
    if (entry.changes && Array.isArray(entry.changes)) {
      await processInstagramComments(entry, initialWorkspaceId);
      await processInstagramFollows(entry, initialWorkspaceId);
    }
  }
}

/**
 * Processa eventos de novos seguidores do Instagram (field 'follows'),
 * criando contato + conversa e disparando automações com trigger_type = 'welcome_dm'.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function processInstagramFollows(
  entry: any,
  initialWorkspaceId?: string | null
) {
  const entryId = entry.id;
  if (!entry.changes || !Array.isArray(entry.changes)) return;

  for (const change of entry.changes) {
    const isFollow = change.field === 'follows' && change.value?.type === 'follow';

    if (!isFollow) continue;

    const followerId = change.value.user?.id;
    const followerUsername = change.value.user?.username || null;

    if (!followerId) continue;

    const recipientId = entryId;

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
      console.warn(`[Seguidores] Conta do Instagram não localizada para recipientId: ${recipientId}`);
      continue;
    }

    const activeWorkspaceId = account.workspace_id;

    const { contact, conversation, created } = await getOrCreateContactAndConversation(
      activeWorkspaceId,
      account,
      followerId,
      'dm',
      { markUnread: false, username: followerUsername }
    );

    if (!contact || !conversation) continue;

    // Só envia boas-vindas para quem é realmente um contato novo
    if (!created) continue;

    const welcomeFlowId = conversation.active_flow_id;
    if (!welcomeFlowId) continue;

    await supabase
      .from('conversations')
      .update({ active_flow_id: welcomeFlowId, flow_cursor: null })
      .eq('id', conversation.id);

    await dispatchFlowExecution({
      workspaceId: activeWorkspaceId,
      contactId: contact.id,
      conversationId: conversation.id,
      recipientId,
      senderId: followerId,
      flowId: welcomeFlowId,
      nodeId: null
    });
  }
}

/**
 * Processa comentários do Instagram transformando-os em contato + conversa + mensagem,
 * permitindo que o agente responda o comentário publicamente ou via DM (cross-channel).
 * Também dispara automações com trigger_type = 'comment_keyword'.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function processInstagramComments(
  entry: any,
  initialWorkspaceId?: string | null
) {
  const entryId = entry.id;
  if (!entry.changes || !Array.isArray(entry.changes)) return;

  for (const change of entry.changes) {
    const isComment =
      change.field === 'comments' ||
      change.value?.item === 'comment' ||
      change.value?.verb === 'add';

    if (!isComment || !change.value?.text) continue;

    const senderId = change.value.from?.id;
    const commentText = (change.value.text || '').trim();
    const commentId = change.value.id;
    const mediaId = change.value.media?.id || null;
    const recipientId = entryId;

    if (!senderId || !commentText || !commentId) continue;

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
      console.warn(`[Comentários] Conta do Instagram não localizada para recipientId (comment): ${recipientId}`);
      continue;
    }

    const activeWorkspaceId = account.workspace_id;

    const { contact, conversation } = await getOrCreateContactAndConversation(activeWorkspaceId, account, senderId, 'comment');
    if (!contact || !conversation) continue;

    // Buscar contexto do post (legenda + thumbnail) para a citação no Inbox
    let mediaInfo: { caption?: string; media_url?: string; thumbnail_url?: string } | null = null;
    if (mediaId && account.access_token) {
      try {
        const isMetaToken = account.access_token.startsWith('EAA');
        const domain = isMetaToken ? 'graph.facebook.com' : 'graph.instagram.com';
        const mediaRes = await fetch(
          `https://${domain}/v22.0/${mediaId}?fields=caption,media_url,thumbnail_url&access_token=${account.access_token}`
        );
        const mediaData = await mediaRes.json();
        if (mediaData && !mediaData.error) mediaInfo = mediaData;
      } catch {
        /* ignora falha ao buscar mídia */
      }
    }

    // Salvar o comentário como mensagem para aparecer no Inbox (dedupe pelo commentId)
    try {
      const { error: insertErr } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_type: 'user',
          message_type: 'comment',
          content: commentText,
          direction: 'inbound',
          media_url: change.value.media?.url || null,
          metadata: {
            media_id: mediaId,
            post_url: change.value.media?.url || mediaInfo?.media_url || null,
            post_text: mediaInfo?.caption || null,
            thumbnail_url: mediaInfo?.thumbnail_url || mediaInfo?.media_url || null
          },
          meta_message_id: commentId
        });

      if (insertErr) {
        // Duplicata (o mesmo payload pode chegar pelo Inngest e pelo processamento síncrono)
        if (insertErr.code !== '23505') {
          console.error('[Comentários] Erro ao salvar comentário como mensagem:', insertErr);
        }
      }
    } catch (e) {
      console.error('[Comentários] Falha ao salvar comentário como mensagem:', e);
    }

    // Disparar automação comment_keyword
    const { data: activeFlows } = await supabase
      .from('flows')
      .select('id, trigger_type, trigger_config, triggers')
      .eq('workspace_id', activeWorkspaceId)
      .in('status', ['active', 'published']);

    const matchedFlowId = matchActiveFlow(activeFlows || [], 'comment_keyword', commentText, mediaId);

    if (matchedFlowId) {
      await supabase
        .from('conversations')
        .update({ active_flow_id: matchedFlowId, flow_cursor: null })
        .eq('id', conversation.id);

      await logFlowExecution(activeWorkspaceId, matchedFlowId, contact, 'comment_keyword', commentText);

      try {
        if (process.env.INNGEST_EVENT_KEY) {
          await inngest.send({
            name: 'flow/execute',
            data: {
              workspaceId: activeWorkspaceId,
              contactId: contact.id,
              conversationId: conversation.id,
              recipientId: recipientId,
              senderId: senderId,
              flowId: matchedFlowId,
              nodeId: null,
              commentId: commentId
            }
          });
        } else {
          throw new Error("INNGEST_EVENT_KEY ausente");
        }
      } catch (inngestErr) {
        console.warn(`[Comentários] Fallback para execução síncrona de comentário: ${inngestErr}`);
        const { executeFlowDirect } = await import('@/utils/flowEngineDirect');
        try {
          await executeFlowDirect({
            workspaceId: activeWorkspaceId,
            contactId: contact.id,
            conversationId: conversation.id,
            recipientId: recipientId,
            senderId: senderId,
            flowId: matchedFlowId,
            nodeId: null,
            commentId: commentId
          });
        } catch (e) {
          console.error("[Flow Engine Direct] Erro no fallback de comentário:", e);
        }
      }
    }
  }
}

