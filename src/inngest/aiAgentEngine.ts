import { inngest } from './client';
import { createClient } from '@supabase/supabase-js';
import { canSendMessage } from '@/utils/instagramGuard';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const processAiAgent = inngest.createFunction(
  { id: 'process-ai-agent-response', triggers: [{ event: 'ai/process' }] },
  async ({ event, step }) => {
    const { workspaceId, conversationId, senderId, userMessageText } = event.data;

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
        system_prompt: 'Você é um assistente virtual atencioso e prestativo da nossa empresa no Instagram. Responda de forma clara, educada e sucinta em português.',
        llm_provider: 'gemini',
        model: 'gemini-flash-latest',
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
        
      const settingsMap = (systemSettings || []).reduce((acc: Record<string, string>, curr: { key: string, value: string }) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});

      const dbGeminiKey = settingsMap['GEMINI_API_KEY'];
      const dbOpenaiKey = settingsMap['OPENAI_API_KEY'];

      const geminiKey = aiConfig.gemini_api_key || process.env.GEMINI_API_KEY || dbGeminiKey;
      const openaiKey = aiConfig.openai_api_key || process.env.OPENAI_API_KEY || dbOpenaiKey;
      const provider = aiConfig.llm_provider || 'gemini';

      console.log(`[AI Agent] Provedor configurado: ${provider}`);

      if (!geminiKey && !openaiKey) {
        return `Obrigado pela mensagem! Configure a chave de API da IA nas Integrações para que eu possa responder automaticamente.`;
      }

        const modelId = aiConfig.model || 'gemini-flash-latest';
        const modelMap: Record<string, string> = {
          'gemini-1.5-flash': 'gemini-flash-latest',
          'gemini-1.5-flash-latest': 'gemini-flash-latest',
          'gemini-1.5-pro': 'gemini-1.5-pro-latest',
          'gemini-pro': 'gemini-1.5-pro-latest',
        };

      try {
        if (provider === 'gemini' || (!openaiKey && geminiKey)) {
          if (!geminiKey) {
            return 'Chave da API Gemini não configurada. Acesse as Integrações para configurá-la.';
          }

          // Build clean Gemini request - filter bot/empty messages, strict alternating turns
          const cleanHistory = (historyMessages as { sender_type: string; content: string }[])
            .filter(m => (m.sender_type === 'user' || m.sender_type === 'ai') && m.content && m.content.trim().length > 0);

          const geminiContents: { role: string; parts: { text: string }[] }[] = [];
          let lastRole = '';

          for (const msg of cleanHistory) {
            const role = msg.sender_type === 'user' ? 'user' : 'model';
            if (role === lastRole) {
              geminiContents[geminiContents.length - 1].parts.push({ text: msg.content });
            } else {
              geminiContents.push({ role, parts: [{ text: msg.content }] });
              lastRole = role;
            }
          }

          // Ensure ends with user message
          if (geminiContents.length === 0 || geminiContents[geminiContents.length - 1].role !== 'user') {
            const userText = (userMessageText || '').trim();
            if (userText) {
              geminiContents.push({ role: 'user', parts: [{ text: userText }] });
            }
          }

          if (geminiContents.length === 0) {
            return 'Olá! Como posso te ajudar?';
          }

          const rawModel = aiConfig.model || 'gemini-flash-latest';
          const resolvedModel = modelMap[rawModel] || rawModel;

          const requestBody: Record<string, unknown> = { contents: geminiContents };
          if (aiConfig.system_prompt && aiConfig.system_prompt.trim()) {
            requestBody.system_instruction = { parts: [{ text: aiConfig.system_prompt }] };
          }

          console.log(`[AI Agent] Chamando Gemini model: ${resolvedModel} com ${geminiContents.length} turnos`);
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${geminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody)
            }
          );
          const geminiData = await res.json();
          if (geminiData.error) {
            console.error('[AI Agent] Gemini API error:', JSON.stringify(geminiData.error));
            return 'Desculpe, estou com dificuldades técnicas no momento.';
          }
          return geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Desculpe, não consegui processar a resposta no momento.';
        } else {
          // OpenAI Call
          if (!openaiKey) {
            return 'Chave da API OpenAI não configurada. Acesse as Integrações para configurá-la.';
          }
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
                ...(historyMessages as { sender_type: string; content: string }[]).map(msg => ({
                  role: msg.sender_type === 'user' ? 'user' : 'assistant',
                  content: msg.content || ''
                }))
              ],
              max_tokens: 400
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
          const graphHost = account.access_token.startsWith('EAA') ? 'graph.facebook.com' : 'graph.instagram.com';
          const res = await fetch(`https://${graphHost}/v22.0/me/messages`, {
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
