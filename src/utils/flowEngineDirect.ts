import { createClient } from '@supabase/supabase-js';
import { canSendMessage } from '@/utils/instagramGuard';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function executeFlowDirect(data: {
  workspaceId: string;
  contactId: string;
  conversationId: string;
  recipientId: string;
  senderId: string;
  flowId: string;
  nodeId: string | null;
  commentId?: string;
}) {
  const { workspaceId, contactId, conversationId, flowId, nodeId, commentId, senderId } = data;

  let currentNodeId: string | null = nodeId;
  let iteration = 0;

  // Buscar dados do fluxo
  const { data: flow } = await supabase
    .from('flows')
    .select('graph_json, flow_data, instagram_account_id, instagram_accounts(access_token)')
    .eq('id', flowId)
    .maybeSingle();
  
  if (flow && 'execution_count' in flow) {
    await supabase
      .from('flows')
      .update({ execution_count: ((flow as Record<string, unknown>).execution_count as number || 0) + 1 })
      .eq('id', flowId);
  }

  if (!flow) return { message: 'Fluxo não encontrado' };

  const graphData = flow.graph_json || flow.flow_data || {};
  const nodes = graphData.nodes || [];
  const edges = graphData.edges || [];

  let pageAccessToken = Array.isArray(flow.instagram_accounts) 
    ? (flow.instagram_accounts[0] as Record<string, unknown>)?.access_token as string | undefined
    : (flow.instagram_accounts as unknown as Record<string, unknown>)?.access_token as string | undefined;

  if (!pageAccessToken) {
    const { data: account } = await supabase
      .from('instagram_accounts')
      .select('access_token')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();
    pageAccessToken = account?.access_token;
  }

  if (!pageAccessToken) return { message: 'Access Token do Instagram não encontrado' };

  if (!currentNodeId && nodes.length > 0) {
    const startNode = nodes.find((n: { type: string, id: string }) => n.type === 'triggerNode' || n.type === 'start');
    currentNodeId = startNode ? startNode.id : nodes[0].id;
  }

  // Loop de Travessia do Grafo de Nós do React Flow (Limitação p/ Direct Engine)
  while (currentNodeId && iteration < 10) {
    const loopNodeId = currentNodeId;
    const node = nodes.find((n: { id: string, type: string, data?: Record<string, unknown> }) => n.id === loopNodeId);

    if (!node) break;

    console.log(`[Flow Engine Direct] Executando Nó: ${node.type} (${loopNodeId})`);

    await supabase
      .from('conversations')
      .update({
        active_flow_id: flowId,
        flow_cursor: { currentNodeId: loopNodeId, iteration, updatedAt: new Date().toISOString() }
      })
      .eq('id', conversationId);

    let nextEdgeSourceHandle: string | null = null;

    if (node.type === 'messageNode' || node.type === 'send_message' || node.type === 'quick_reply') {
      const guardResult = await canSendMessage(conversationId, supabase);

      if (guardResult.allowed) {
        const { sendFlowMessageNode } = await import('@/services/messagingService');

        try {
          await sendFlowMessageNode({
            conversationId,
            nodeData: (node.data as Record<string, unknown>) || {},
            commentId: iteration === 0 ? commentId : undefined
          });
        } catch (err: unknown) {
          console.error('[Flow Engine Direct] Erro ao enviar mensagem:', err instanceof Error ? err.message : String(err));
        }
      } else {
        console.warn(`[Flow Engine Direct] Envio de nó cancelado: ${guardResult.reason}`);
      }
    }
    else if (node.type === 'commentReplyNode') {
      const publicReply = node.data?.publicReply as string | undefined;
      if (publicReply && commentId && pageAccessToken) {
        const isMetaToken = pageAccessToken.startsWith('EAA');
        const domain = isMetaToken ? 'graph.facebook.com' : 'graph.instagram.com';
        const url = `https://${domain}/v22.0/${commentId}/replies`;
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${pageAccessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: publicReply })
          });
          const result = await response.json();
          if (result.error) {
            console.error('[Flow Engine Direct] Erro retornado pela Meta ao responder comentário:', result.error);
          }
        } catch (err: unknown) {
          console.error('[Flow Engine Direct] Erro ao enviar resposta pública ao comentário:', err instanceof Error ? err.message : String(err));
        }
      }
    }
    else if (node.type === 'delayNode' || node.type === 'delay') {
      console.log(`[Flow Engine Direct] Pausando execução por ser delay, Vercel Serverless não suporta delay síncrono nativamente.`);
      break; 
    }
    else if (node.type === 'actionNode' || node.type === 'set_field') {
      const actionType = node.data?.actionType || 'set_field';
      const actionValue = node.data?.actionValue;
      const fieldKey = node.data?.fieldKey;

      if (actionType === 'add_tag' && actionValue) {
        let { data: tag } = await supabase.from('tags').select('id').eq('workspace_id', workspaceId).eq('name', actionValue).maybeSingle();
        if (!tag) {
          const { data: newTag } = await supabase.from('tags').insert({ workspace_id: workspaceId, name: actionValue }).select('id').single();
          tag = newTag;
        }
        if (tag) {
          await supabase.from('contact_tags').upsert({ contact_id: contactId, tag_id: tag.id }, { onConflict: 'contact_id,tag_id' });
        }
      } else if (actionType === 'remove_tag' && actionValue) {
        const { data: tag } = await supabase.from('tags').select('id').eq('workspace_id', workspaceId).eq('name', actionValue).maybeSingle();
        if (tag) {
          await supabase.from('contact_tags').delete().eq('contact_id', contactId).eq('tag_id', tag.id);
        }
      } else if (fieldKey && actionValue) {
        const { data: contact } = await supabase.from('contacts').select('custom_fields').eq('id', contactId).maybeSingle();
        const currentFields = contact?.custom_fields || {};
        await supabase.from('contacts').update({
          custom_fields: { ...currentFields, [fieldKey]: actionValue }
        }).eq('id', contactId);
      }
    }
    else if (node.type === 'humanHandoffNode' || node.type === 'human_handoff') {
      await supabase.from('conversations').update({
        status: 'human',
        flow_cursor: null,
        last_interaction_at: new Date().toISOString()
      }).eq('id', conversationId);

      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_type: 'bot',
        message_type: 'text',
        content: '💬 Atendimento transferido para um agente humano.'
      });
      break; 
    }
    else if (node.type === 'aiHandoffNode' || node.type === 'ai_handoff') {
      await supabase.from('conversations').update({
        status: 'ai',
        flow_cursor: null,
        last_interaction_at: new Date().toISOString()
      }).eq('id', conversationId);

      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_type: 'bot',
        message_type: 'text',
        content: '🤖 Assistente virtual de Inteligência Artificial assumiu o atendimento.'
      });
      
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content')
        .eq('conversation_id', conversationId)
        .eq('sender_type', 'user')
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { executeAiDirect } = await import('@/utils/aiEngineDirect');
      try {
        await executeAiDirect({
          workspaceId,
          conversationId,
          senderId,
          userMessageText: lastMsg?.content || ''
        });
      } catch (err) {
        console.error(`[Flow Engine Direct] Erro no executeAiDirect:`, err);
      }
      break;
    }
    else if (node.type === 'crmNode' || node.type === 'crm_webhook') {
      const webhookUrl = node.data?.webhookUrl as string | undefined;
      if (webhookUrl) {
        try {
          const { data: contact } = await supabase.from('contacts').select('*').eq('id', contactId).maybeSingle();
          const crmRes = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'lead_captured', workspace_id: workspaceId, contact })
          });
          try {
            await supabase.from('crm_sync_log').insert({
              contact_id: contactId,
              status: crmRes.ok ? 'success' : 'failed',
              response_snippet: `Status: ${crmRes.status}`
            });
          } catch {
            /* tabela de log pode não existir ainda */
          }
        } catch (crmErr) {
          console.error('[Flow Engine Direct] Falha ao disparar Webhook CRM:', crmErr);
        }
      }
    }
    else if (node.type === 'conditionNode' || node.type === 'condition') {
      const conditionValue = node.data?.conditionValue as string | undefined;
      if (!conditionValue) {
        nextEdgeSourceHandle = 'false';
      } else {
        const { data: tag } = await supabase.from('tags').select('id').eq('workspace_id', workspaceId).eq('name', conditionValue).maybeSingle();
        if (!tag) {
          nextEdgeSourceHandle = 'false';
        } else {
          const { data: contactTag } = await supabase.from('contact_tags').select('contact_id').eq('contact_id', contactId).eq('tag_id', tag.id).maybeSingle();
          nextEdgeSourceHandle = contactTag ? 'true' : 'false';
        }
      }
    }

    let outgoingEdge: { target: string } | undefined;
    if (nextEdgeSourceHandle) {
      outgoingEdge = edges.find((e: { source: string, sourceHandle: string, target: string }) => e.source === loopNodeId && e.sourceHandle === nextEdgeSourceHandle);
    } else {
      outgoingEdge = edges.find((e: { source: string, target: string }) => e.source === loopNodeId);
    }

    if (outgoingEdge) {
      currentNodeId = outgoingEdge.target;
    } else {
      currentNodeId = null;
      await supabase.from('conversations').update({ active_flow_id: null, flow_cursor: null }).eq('id', conversationId);
    }

    iteration++;
  }
}
