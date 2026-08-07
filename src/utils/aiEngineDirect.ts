import { createClient } from '@supabase/supabase-js';
import { canSendMessage } from '@/utils/instagramGuard';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function executeAiDirect(data: {
  workspaceId: string;
  conversationId: string;
  senderId: string;
  userMessageText: string;
}) {
  const { workspaceId, conversationId, senderId, userMessageText } = data;

  console.log(`[AI Engine Direct] Iniciando processamento para conversa ${conversationId}`);

  try {
    // 1. Buscar configuração do Agente de IA (ai_agent_configs)
    const { data: aiConfigData } = await supabase
      .from('ai_agent_configs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .limit(1)
      .maybeSingle();

    const aiConfig = aiConfigData || {
      name: 'Assistente IA NexaChat',
      system_prompt: 'Você é um assistente virtual atencioso e prestativo da nossa empresa no Instagram. Responda de forma clara, educada e sucinta em português.',
      llm_provider: 'gemini',
      model: 'gemini-flash-latest',
      handoff_rules: { keywords: ['falar com humano', 'atendente', 'suporte humano'], max_turns: 6 }
    };

    console.log(`[AI Engine Direct] Config carregada: provider=${aiConfig.llm_provider}, model=${aiConfig.model}`);

    // 2. Verificar regras de handoff humano
    const handoffRules = aiConfig.handoff_rules || {};
    const keywords: string[] = handoffRules.keywords || ['falar com humano', 'atendente'];
    const lowerMessage = (userMessageText || '').toLowerCase();
    const isKeywordHandoff = keywords.some((k: string) => lowerMessage.includes(k.toLowerCase()));

    if (isKeywordHandoff) {
      console.log(`[AI Engine Direct] Handoff humano ativado por palavra-chave`);
      await supabase.from('conversations').update({
        status: 'human',
        last_interaction_at: new Date().toISOString()
      }).eq('id', conversationId);

      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_type: 'bot',
        message_type: 'text',
        content: '🔔 Um atendente humano assumirá seu atendimento em instantes.'
      });
      return { message: 'Transferido para atendimento humano' };
    }

    // 3. Verificar janela de 24h (para envio via Meta)
    const guardResult = await canSendMessage(conversationId, supabase);
    if (!guardResult.allowed) {
      console.warn(`[AI Engine Direct] Envio bloqueado: ${guardResult.reason}`);
      // Still save the AI response in the DB even if Meta sending is blocked
    }

    // 4. Buscar histórico recente de mensagens
    const { data: messages } = await supabase
      .from('messages')
      .select('sender_type, content')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: false })
      .limit(10);

    const historyMessages = (messages || []).reverse();

    // 5. Buscar chave de API do banco (system_settings)
    const { data: systemSettings } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['GEMINI_API_KEY', 'OPENAI_API_KEY']);

    const settingsMap = (systemSettings || []).reduce((acc: Record<string, string>, curr: { key: string; value: string }) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    const dbGeminiKey = settingsMap['GEMINI_API_KEY'];
    const dbOpenaiKey = settingsMap['OPENAI_API_KEY'];

    const geminiKey = process.env.GEMINI_API_KEY || dbGeminiKey;
    const openaiKey = process.env.OPENAI_API_KEY || dbOpenaiKey;

    // 6. Chamar a API da IA
    let aiResponseText = '';

    try {
      const provider = aiConfig.llm_provider || 'gemini';
      console.log(`[AI Engine Direct] Usando provedor: ${provider}`);

      if (provider === 'gemini' || (!openaiKey && geminiKey)) {
        if (!geminiKey) {
          console.error('[AI Engine Direct] GEMINI_API_KEY não configurada!');
          aiResponseText = 'Obrigado pela mensagem! Em breve nosso time responderá.';
        } else {
          // Build clean Gemini request using systemInstruction + contents
          // Filter: only real user and AI messages (skip bot/system messages), non-empty
          const cleanHistory = (historyMessages as { sender_type: string; content: string }[])
            .filter(m => (m.sender_type === 'user' || m.sender_type === 'ai') && m.content && m.content.trim().length > 0);

          // Build strictly alternating user/model turns
          const geminiContents: { role: string; parts: { text: string }[] }[] = [];
          let lastRole = '';

          for (const msg of cleanHistory) {
            const role = msg.sender_type === 'user' ? 'user' : 'model';
            if (role === lastRole) {
              // Merge with previous entry to avoid consecutive same role
              geminiContents[geminiContents.length - 1].parts.push({ text: msg.content });
            } else {
              geminiContents.push({ role, parts: [{ text: msg.content }] });
              lastRole = role;
            }
          }

          // Ensure we always end with a user message
          if (geminiContents.length === 0 || geminiContents[geminiContents.length - 1].role !== 'user') {
            const userText = (userMessageText || '').trim();
            if (!userText) {
              aiResponseText = 'Olá! Como posso te ajudar?';
              // Skip API call, we already set the response
            } else {
              geminiContents.push({ role: 'user', parts: [{ text: userText }] });
            }
          }

          if (!aiResponseText) {
            const modelId = aiConfig.model || 'gemini-1.5-flash-latest';
            const modelMap: Record<string, string> = {
              'gemini-flash-latest': 'gemini-1.5-flash-latest',
              'gemini-1.5-flash': 'gemini-1.5-flash-latest',
              'gemini-1.5-pro': 'gemini-1.5-pro-latest',
              'gemini-pro': 'gemini-1.5-pro-latest',
            };
            const resolvedModel = modelMap[modelId] || modelId;

            console.log(`[AI Engine Direct] Chamando Gemini model: ${resolvedModel} com ${geminiContents.length} turnos`);

            const requestBody: Record<string, unknown> = { contents: geminiContents };

            // Add system instruction if available (cleanest way for Gemini)
            if (aiConfig.system_prompt && aiConfig.system_prompt.trim()) {
              requestBody.system_instruction = {
                parts: [{ text: aiConfig.system_prompt }]
              };
            }

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
              console.error('[AI Engine Direct] Gemini API error:', JSON.stringify(geminiData.error));
              aiResponseText = 'Desculpe, estou com dificuldades técnicas no momento.';
            } else {
              aiResponseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
                || 'Desculpe, não consegui processar a resposta no momento.';
            }
          }
        }
      } else if (openaiKey) {
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
            max_tokens: 400
          })
        });
        const openaiData = await res.json();
        aiResponseText = openaiData.choices?.[0]?.message?.content || 'Desculpe, não consegui processar a resposta.';
      } else {
        console.error('[AI Engine Direct] Nenhuma chave de API disponível!');
        aiResponseText = 'Obrigado pelo contato! Em breve nosso time responderá.';
      }
    } catch (err) {
      console.error('[AI Engine Direct] Erro ao chamar LLM:', err);
      aiResponseText = 'Obrigado por entrar em contato! Em breve nosso time te responderá.';
    }

    console.log(`[AI Engine Direct] Resposta gerada (${aiResponseText.length} chars)`);

    // 7. Enviar resposta via Meta Graph API (se a janela de 24h permitir)
    if (guardResult.allowed) {
      const { data: account } = await supabase
        .from('instagram_accounts')
        .select('access_token')
        .eq('workspace_id', workspaceId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (account?.access_token) {
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

          const metaResult = await res.json();
          if (!res.ok || metaResult.error) {
            console.error('[AI Engine Direct] Falha no envio Meta Graph API:', metaResult);
          } else {
            console.log('[AI Engine Direct] Mensagem enviada com sucesso via Meta Graph API');
          }
        } catch (sendErr) {
          console.error('[AI Engine Direct] Erro de rede ao enviar via Meta:', sendErr);
        }
      } else {
        console.warn('[AI Engine Direct] Nenhum access_token do Instagram encontrado para o workspace');
      }
    }

    // 8. Salvar resposta da IA no banco de dados
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

    console.log(`[AI Engine Direct] Processamento concluído para conversa ${conversationId}`);
    return { message: 'Resposta da IA gerada e enviada com sucesso' };

  } catch (error) {
    console.error(`[AI Engine Direct] Erro global:`, error);
    return { message: 'Erro interno no AI Engine Direct' };
  }
}
