import { inngest } from './client';
import { createClient } from '@supabase/supabase-js';
import { canSendMessage } from '@/utils/instagramGuard';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const processAiAgent = inngest.createFunction(
  { id: 'process-ai-agent-response', triggers: [{ event: 'ai/process' }] },
  async ({ event, step }) => {
    const { workspaceId, conversationId, contactId, senderId, recipientId, userMessageText } = event.data;

    // 1. Buscar configuração do Agente de IA para o workspace
    const aiConfig = await step.run('fetch-ai-config', async () => {
      const { data } = await supabase
        .from('ai_agent_configs')
        .select('*')
        .eq('workspace_id', workspaceId)
        .limit(1)
        .maybeSingle();

      return data || {
        name: 'Assistente IA NexaChat',
        system_prompt: 'Você é um assistente virtual atencioso e prestativo. Responda de forma sucinta e direta em português.',
        llm_provider: 'openai',
        model: 'gpt-4o-mini',
        handoff_rules: { keywords: ['falar com humano', 'atendente', 'suporte humano'], max_turns: 6 }
      };
    });

    // 2. Verificar Regras de Handoff Humano (Transferência de Atendimento)
    const handoffRules = aiConfig.handoff_rules || {};
    const keywords: string[] = handoffRules.keywords || ['falar com humano', 'atendente'];
    const lowerMessage = (userMessageText || '').toLowerCase();

    const isKeywordHandoff = keywords.some(k => lowerMessage.includes(k.toLowerCase()));

    // Verificar contagem de mensagens se max_turns estiver definido
    const turnCount = await step.run('check-turns-count', async () => {
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId);
      return count || 0;
    });

    const isMaxTurnsExceeded = Boolean(handoffRules.max_turns && turnCount >= handoffRules.max_turns * 2);

    if (isKeywordHandoff || isMaxTurnsExceeded) {
      console.log(`[AI Agent] Handoff humano ativado para conversa ${conversationId}`);
      await step.run('trigger-human-handoff', async () => {
        await supabase
          .from('conversations')
          .update({
            status: 'human',
            last_interaction_at: new Date().toISOString()
          })
          .eq('id', conversationId);

        // Notificar usuário no chat
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_type: 'bot',
          message_type: 'text',
          content: '🔔 Um atendente humano assumirá seu atendimento em instantes.'
        });
      });

      return { message: 'Transferido para atendimento humano' };
    }

    // 3. Validação de Regras de Negócio e Janela de 24 horas
    const guardResult = await step.run('check-24h-guard', async () => {
      return await canSendMessage(conversationId, supabase);
    });

    if (!guardResult.allowed) {
      console.warn(`[AI Agent] Envio de mensagem bloqueado pela guarda de 24h: ${guardResult.reason}`);
      return { message: `Bloqueado: ${guardResult.reason}` };
    }

    // 4. Buscar histórico recente da conversa para dar contexto à IA
    const historyMessages = await step.run('fetch-chat-history', async () => {
      const { data } = await supabase
        .from('messages')
        .select('sender_type, content')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: false })
        .limit(10);

      return (data || []).reverse();
    });

    // 5. Chamada ao Provedor de LLM (OpenAI ou Gemini)
    const aiResponseText = await step.run('generate-llm-response', async () => {
      // Fetch keys from system_settings
      const { data: systemSettings } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['GEMINI_API_KEY', 'OPENAI_API_KEY']);
        
      const settingsMap = (systemSettings || []).reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});

      const dbGeminiKey = settingsMap['GEMINI_API_KEY'];
      const dbOpenaiKey = settingsMap['OPENAI_API_KEY'];

      const apiKey = process.env.OPENAI_API_KEY || dbOpenaiKey || process.env.GEMINI_API_KEY || dbGeminiKey;

      if (!apiKey) {
        return `Obrigado pela mensagem! No momento estou operando em modo demonstrativo. Como posso te ajudar?`;
      }

      try {
        if (aiConfig.llm_provider === 'gemini' || (!aiConfig.llm_provider && (process.env.GEMINI_API_KEY || dbGeminiKey))) {
          const geminiKey = process.env.GEMINI_API_KEY || dbGeminiKey || apiKey;
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                { role: 'user', parts: [{ text: `System Instruction: ${aiConfig.system_prompt}` }] },
                ...historyMessages.map((msg: { sender_type: string; content: string }) => ({
                  role: msg.sender_type === 'user' ? 'user' : 'model',
                  parts: [{ text: msg.content || '' }]
                }))
              ]
            })
          });
          const geminiData = await res.json();
          return geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Desculpe, não consegui processar a resposta no momento.';
        } else {
          // OpenAI Call
          const openaiKey = process.env.OPENAI_API_KEY || dbOpenaiKey || apiKey;
          const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: aiConfig.model || 'gpt-4o-mini',
              messages: [
                { role: 'system', content: aiConfig.system_prompt },
                ...historyMessages.map((msg: { sender_type: string; content: string }) => ({
                  role: msg.sender_type === 'user' ? 'user' : 'assistant',
                  content: msg.content || ''
                }))
              ],
              max_tokens: 300
            })
          });
          const openaiData = await res.json();
          return openaiData.choices?.[0]?.message?.content || 'Desculpe, não consegui processar a resposta.';
        }
      } catch (err) {
        console.error('[AI Agent] Erro ao chamar LLM API:', err);
        return 'Obrigado por entrar em contato! Em breve nosso time te responderá.';
      }
    });

    // 6. Buscar token da conta do Instagram conectada
    const account = await step.run('fetch-account-token', async () => {
      const { data } = await supabase
        .from('instagram_accounts')
        .select('access_token')
        .eq('workspace_id', workspaceId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      return data;
    });

    if (account?.access_token) {
      // 7. Enviar resposta para o contato no Instagram via Meta Graph API
      await step.run('send-meta-instagram-msg', async () => {
        try {
          const res = await fetch('https://graph.instagram.com/v22.0/me/messages', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${account.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              recipient: { id: senderId },
              message: { text: aiResponseText }
            })
          });

          if (!res.ok) {
            console.error('[AI Agent] Falha no envio Graph API:', await res.json());
          }
        } catch (sendErr) {
          console.error('[AI Agent] Erro de rede ao disparar resposta Meta:', sendErr);
        }
      });
    }

    // 8. Salvar mensagem gerada pela IA no banco de dados (aparece instantaneamente no Live Chat)
    await step.run('save-ai-message-db', async () => {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_type: 'ai',
        message_type: 'text',
        content: aiResponseText
      });

      await supabase
        .from('conversations')
        .update({ last_interaction_at: new Date().toISOString() })
        .eq('id', conversationId);
    });

    return { message: 'Resposta da IA gerada e enviada com sucesso' };
  }
);
