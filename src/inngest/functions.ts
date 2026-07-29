import { inngest } from './client'
import { prisma } from '@/lib/prisma'

export const processWebhookEvent = inngest.createFunction(
  { id: 'process-instagram-webhook', triggers: [{ event: 'instagram/webhook.received' }] },
  async ({ event, step }) => {
    const body = event.data
    await step.run('process-messages', async () => {
      console.log('Inngest: Processando evento Webhook')
      if (!body?.entry) return

      for (const entry of body.entry) {
        if (!entry.messaging) continue;
        
        for (const webhookEvent of entry.messaging) {
          if (!webhookEvent.message) continue;
          
          const senderId = webhookEvent.sender.id;
          const recipientId = webhookEvent.recipient.id; // Nosso ig_user_id oficial
          const messageText = webhookEvent.message.text;
          
          console.log(`Nova mensagem Inngest de ${senderId} para ${recipientId}: ${messageText}`)

          // 1. Identificar Workspace
          const accountFull = await prisma.instagram_accounts.findUnique({
            where: { ig_user_id: recipientId }
          })
          
          if (!accountFull) {
            console.log(`Conta IG ${recipientId} não encontrada no banco.`);
            continue;
          }
          const workspaceId = accountFull.workspace_id;
          const pageAccessToken = accountFull.access_token;

          // 2. Localizar ou Criar Contato
          let contact = await prisma.contacts.findUnique({
            where: {
              instagram_account_id_ig_scoped_id: {
                instagram_account_id: accountFull.id,
                ig_scoped_id: senderId
              }
            }
          });

          if (!contact) {
            contact = await prisma.contacts.create({
              data: {
                workspace_id: workspaceId,
                instagram_account_id: accountFull.id,
                ig_scoped_id: senderId,
                name: 'Lead do Instagram' 
              }
            });
          }

          if (!contact) continue;

          // 3. Localizar ou Criar Conversação
          let conversation = await prisma.conversations.findFirst({
            where: {
              workspace_id: workspaceId,
              contact_id: contact.id
            }
          });

          if (!conversation) {
            conversation = await prisma.conversations.create({
              data: {
                workspace_id: workspaceId,
                contact_id: contact.id,
                status: 'bot_active'
              }
            });
          }

          if (!conversation) continue;

          // 4. Inserir a mensagem recebida no banco
          await prisma.messages.create({
            data: {
              conversation_id: conversation.id,
              sender_type: 'user',
              message_type: 'text',
              content: messageText
            }
          });

          await prisma.conversations.update({
            where: { id: conversation.id },
            data: { last_interaction_at: new Date() }
          });

          // 5. Motor do Fluxo (Se o bot estiver ativo)
          if (conversation.status === 'bot_active') {
            const flows = await prisma.flows.findMany({
              where: {
                workspace_id: workspaceId,
                status: 'active'
              }
            });
            
            if (flows && flows.length > 0) {
              const flow = flows[0];
              const flowData: any = flow.flow_data || {};
              const nodes = flowData.nodes || [];
              const edges = flowData.edges || [];

              const triggerNode = nodes.find((n: any) => n.type === 'triggerNode');
              if (triggerNode) {
                const outgoingEdge = edges.find((e: any) => e.source === triggerNode.id);
                if (outgoingEdge) {
                  const messageNode = nodes.find((n: any) => n.id === outgoingEdge.target);
                  
                  if (messageNode && messageNode.type === 'messageNode') {
                    const responseText = messageNode.data?.text || 'Mensagem do Fluxo (Edite no painel)';
                    
                    const metaUrl = `https://graph.facebook.com/v19.0/${recipientId}/messages`;
                    const metaBody = {
                      recipient: { id: senderId },
                      message: { text: responseText }
                    };

                    const metaRes = await fetch(metaUrl, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${pageAccessToken}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify(metaBody)
                    });

                    if (metaRes.ok) {
                      await prisma.messages.create({
                        data: {
                          conversation_id: conversation.id,
                          sender_type: 'bot',
                          message_type: 'text',
                          content: responseText
                        }
                      });
                    } else {
                      const errorData = await metaRes.json();
                      console.error("Erro Send API:", errorData);
                    }
                  }
                }
              }
            }
          }
        }
      }
    })
    return { message: 'Evento processado com sucesso' }
  }
)
