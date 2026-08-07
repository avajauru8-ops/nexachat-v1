import { inngest } from './client';
import { createClient } from '@supabase/supabase-js';
import { canSendMessage } from '@/utils/instagramGuard';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const executeFlow = inngest.createFunction(
  { id: 'execute-flow-engine', triggers: [{ event: 'flow/execute' }] },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async ({ event, step }: { event: any; step: any }) => {
    const { 
      workspaceId, contactId, conversationId, 
      flowId, nodeId, commentId 
    } = event.data;

    let currentNodeId: string | null = nodeId;
    let iteration = 0;

    // Buscar dados do fluxo
    const flow = await step.run('fetch-flow', async () => {
      const { data } = await supabase
        .from('flows')
        .select('graph_json, flow_data, instagram_account_id, instagram_accounts(access_token)')
        .eq('id', flowId)
        .maybeSingle();
      
      if (data && 'execution_count' in data) {
        await supabase
          .from('flows')
          .update({ execution_count: ((data as Record<string, unknown>).execution_count as number || 0) + 1 })
          .eq('id', flowId);
      }
      
      return data;
    });

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

    // Loop de Travessia do Grafo de Nós do React Flow
    while (currentNodeId && iteration < 50) {
      const loopNodeId = currentNodeId;
      const node = nodes.find((n: { id: string, type: string, data?: Record<string, unknown> }) => n.id === loopNodeId);

      if (!node) break;

      console.log(`[Flow Engine] Executando Nó: ${node.type} (${loopNodeId})`);

      // Persistir o cursor atual na conversa para estado de máquina
      await step.run(`update-cursor-${loopNodeId}-${iteration}`, async () => {
        await supabase
          .from('conversations')
          .update({
            active_flow_id: flowId,
            flow_cursor: { currentNodeId: loopNodeId, iteration, updatedAt: new Date().toISOString() }
          })
          .eq('id', conversationId);
      });

      let nextEdgeSourceHandle: string | null = null;

      // --- 1. MENSAGEM (messageNode / send_message / quick_reply) ---
      if (node.type === 'messageNode' || node.type === 'send_message' || node.type === 'quick_reply') {
        // Validação da Janela de 24h da Meta antes do envio
        const guardResult = await step.run(`guard-check-${loopNodeId}-${iteration}`, async () => {
          return await canSendMessage(conversationId, supabase);
        });

        if (guardResult.allowed) {
          await step.run(`node-${loopNodeId}-${iteration}-send-msg`, async () => {
            const { sendFlowMessageNode } = await import('@/services/messagingService');

            try {
              await sendFlowMessageNode({
                conversationId,
                nodeData: (node.data as Record<string, unknown>) || {},
                commentId: iteration === 0 ? commentId : undefined
              });
            } catch (err: unknown) {
              console.error('[Flow Engine] Erro ao chamar serviço interno de envio:', err instanceof Error ? err.message : String(err));
            }
          });
        } else {
          console.warn(`[Flow Engine] Envio de nó ${loopNodeId} cancelado: ${guardResult.reason}`);
        }
      }
      
      // --- RESPOSTA DE COMENTÁRIO (commentReplyNode) ---
      else if (node.type === 'commentReplyNode') {
        await step.run(`node-${loopNodeId}-${iteration}-comment-reply`, async () => {
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
                 console.error('[Flow Engine] Erro retornado pela Meta ao responder comentário:', result.error);
              }
            } catch (err: unknown) {
              console.error('[Flow Engine] Erro ao enviar resposta pública ao comentário:', err instanceof Error ? err.message : String(err));
            }
          } else {
            console.warn(`[Flow Engine] Resposta ao comentário ignorada (commentId ou publicReply ausente)`);
          }
        });
      }

      // --- 2. DELAY (delayNode / delay) ---
      else if (node.type === 'delayNode' || node.type === 'delay') {
        const amount = Number(node.data?.amount) || 1;
        const unit = node.data?.unit || 'minutes';

        let waitTimeStr = `${amount}m`;
        if (unit === 'seconds' || unit === 's') waitTimeStr = `${amount}s`;
        if (unit === 'hours') waitTimeStr = `${amount}h`;
        if (unit === 'days') waitTimeStr = `${amount}d`;

        console.log(`[Flow Engine] Pausando por ${waitTimeStr}...`);
        await step.sleep(`node-${loopNodeId}-${iteration}-delay`, waitTimeStr);
      }

      // --- 3. AÇÃO (actionNode / set_field) ---
      else if (node.type === 'actionNode' || node.type === 'set_field') {
        await step.run(`node-${loopNodeId}-${iteration}-action`, async () => {
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
        });
      }

      // --- 4. HANDOFF HUMANO (humanHandoffNode / human_handoff) ---
      else if (node.type === 'humanHandoffNode' || node.type === 'human_handoff') {
        await step.run(`node-${loopNodeId}-${iteration}-human-handoff`, async () => {
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
        });
        break; // Interrompe o fluxo após handoff
      }

      // --- 5. HANDOFF IA (aiHandoffNode / ai_handoff) ---
      else if (node.type === 'aiHandoffNode' || node.type === 'ai_handoff') {
        await step.run(`node-${loopNodeId}-${iteration}-ai-handoff`, async () => {
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
        });

        // Trigger AI immediately
        await step.run(`trigger-ai-${loopNodeId}-${iteration}`, async () => {
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content')
            .eq('conversation_id', conversationId)
            .eq('sender_type', 'user')
            .order('timestamp', { ascending: false })
            .limit(1)
            .maybeSingle();

          await inngest.send({
            name: 'ai/process',
            data: {
              workspaceId,
              conversationId,
              contactId,
              senderId: event.data.senderId,
              recipientId: event.data.recipientId,
              userMessageText: lastMsg?.content || ''
            }
          });
        });

        break; // Interrompe a automação de nós rígidos para passar o controle à IA
      }

      // --- 6. CRM WEBHOOK (crmNode / crm_webhook) ---
      else if (node.type === 'crmNode' || node.type === 'crm_webhook') {
        await step.run(`node-${loopNodeId}-${iteration}-crm-webhook`, async () => {
          const webhookUrl = node.data?.webhookUrl;
          if (webhookUrl) {
            const { data: contact } = await supabase.from('contacts').select('*').eq('id', contactId).maybeSingle();
            try {
              const crmRes = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event: 'lead_captured', workspace_id: workspaceId, contact })
              });

              // Registrar log de sincronização CRM
              await supabase.from('crm_sync_log').insert({
                contact_id: contactId,
                status: crmRes.ok ? 'success' : 'failed',
                response_snippet: `Status: ${crmRes.status}`
              });
            } catch (crmErr) {
              console.error('[Flow Engine] Falha ao disparar Webhook CRM:', crmErr);
            }
          }
        });
      }

      // --- 7. CONDIÇÃO (conditionNode / condition) ---
      else if (node.type === 'conditionNode' || node.type === 'condition') {
        const conditionResult = await step.run(`node-${loopNodeId}-${iteration}-condition`, async () => {
          const conditionValue = node.data?.conditionValue;
          if (!conditionValue) return false;

          const { data: tag } = await supabase.from('tags').select('id').eq('workspace_id', workspaceId).eq('name', conditionValue).maybeSingle();
          if (!tag) return false;

          const { data: contactTag } = await supabase.from('contact_tags').select('contact_id').eq('contact_id', contactId).eq('tag_id', tag.id).maybeSingle();
          return !!contactTag;
        });

        nextEdgeSourceHandle = conditionResult ? 'true' : 'false';
      }

      // ENCONTRAR PRÓXIMO NÓ
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let outgoingEdge: any;
      if (nextEdgeSourceHandle) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        outgoingEdge = edges.find((e: any) => e.source === loopNodeId && e.sourceHandle === nextEdgeSourceHandle);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        outgoingEdge = edges.find((e: any) => e.source === loopNodeId);
      }

      if (outgoingEdge) {
        currentNodeId = outgoingEdge.target;
      } else {
        currentNodeId = null;
      }

      iteration++;
    }

    // Limpar o cursor após finalizar a travessia do fluxo
    await step.run('clear-flow-cursor', async () => {
      await supabase
        .from('conversations')
        .update({ flow_cursor: null, active_flow_id: null })
        .eq('id', conversationId);
    });

    return { message: 'Fluxo de automação executado e finalizado' };
  }
);
