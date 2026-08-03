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
    // 1. Buscar configuração do Agente de IA para o workspace
    const { data: workspaceData } = await supabase
      .from('workspace_settings')
      .select('value')
      .eq('workspace_id', workspaceId)
      .eq('key', 'ai_config')
      .maybeSingle();

    const aiConfig = workspaceData?.value as Record<string, any> || {
      enabled: false,
      llm_provider: 'gemini',
      system_prompt: 'Você é um assistente virtual atencioso.',
      model: 'gemini-flash-latest'
    };

    if (!aiConfig.enabled) {
      console.log(`[AI Engine Direct] Agente de IA desativado para workspace ${workspaceId}`);
      return { message: 'Agente IA desativado' };
    }

    // 2. Verificar status da conversa
    const { data: conversation } = await supabase
      .from('conversations')
      .select('status')
      .eq('id', conversationId)
      .maybeSingle();

    if (conversation?.status !== 'ai') {
      console.log(`[AI Engine Direct] Conversa ${conversationId} não está em modo AI. Abortando.`);
      return { message: 'Conversa não está em modo AI' };
    }

    // 3. Checar janela de 24h
    const guardResult = await canSendMessage(conversationId, supabase);
    if (!guardResult.allowed) {
      console.warn(`[AI Engine Direct] Envio bloqueado pelo guardião: ${guardResult.reason}`);
      return { message: `Bloqueado: ${guardResult.reason}` };
    }

    // 4. Buscar histórico de mensagens
    const { data: messages } = await supabase
      .from('messages')
      .select('sender_type, content')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: false })
      .limit(10);

    const historyMessages = (messages || []).reverse();

    // 5. Chamada ao Provedor de LLM
    const { data: systemSettings } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['GEMINI_API_KEY', 'OPENAI_API_KEY']);
      
    const settingsMap = (systemSettings || []).reduce((acc: Record<string, string>, curr: { key: string, value: string }) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    const apiKey = process.env.GEMINI_API_KEY || settingsMap['GEMINI_API_KEY'] || process.env.OPENAI_API_KEY || settingsMap['OPENAI_API_KEY'];

    if (!apiKey) {
      console.warn('[AI Engine Direct] Nenhuma chave de API configurada');
      return { message: 'API key not configured' };
    }

    let aiResponseText = '';

    try {
      if (aiConfig.llm_provider === 'gemini' || (!aiConfig.llm_provider && settingsMap['GEMINI_API_KEY'])) {
        const geminiKey = process.env.GEMINI_API_KEY || settingsMap['GEMINI_API_KEY'] || apiKey;
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: `INSTRUÇÕES DO SISTEMA:\n${aiConfig.system_prompt || 'Você é um assistente útil.'}` }] },
              { role: 'model', parts: [{ text: 'Entendido. Como posso ajudar com base nessas instruções?' }] },
              ...historyMessages.map((msg: { sender_type: string; content: string }) => ({
                role: msg.sender_type === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content || '' }]
              }))
            ]
          })
        });
        const geminiData = await res.json();
        if (geminiData.error) {
           console.error('[AI Engine Direct] Gemini Error:', geminiData.error);
           aiResponseText = 'Desculpe, estou com dificuldades técnicas no momento.';
        } else {
           aiResponseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Desculpe, não consegui processar a resposta.';
        }
      } else {
        // Fallback para OpenAI se configurado
        const openaiKey = process.env.OPENAI_API_KEY || settingsMap['OPENAI_API_KEY'] || apiKey;
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
        aiResponseText = openaiData.choices?.[0]?.message?.content || 'Desculpe, não consegui processar a resposta.';
      }
    } catch (err) {
      console.error('[AI Engine Direct] Erro ao chamar LLM API:', err);
      aiResponseText = 'Obrigado por entrar em contato! Em breve nosso time te responderá.';
    }

    // 6. Buscar token do Instagram
    const { data: account } = await supabase
      .from('instagram_accounts')
      .select('access_token')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (account?.access_token) {
      // 7. Enviar resposta para o contato via Meta Graph API
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
          console.error('[AI Engine Direct] Falha no envio Graph API:', await res.json());
        }
      } catch (sendErr) {
        console.error('[AI Engine Direct] Erro de rede ao disparar resposta Meta:', sendErr);
      }
    }

    // 8. Salvar mensagem no DB
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

    console.log(`[AI Engine Direct] Resposta enviada e salva para conversa ${conversationId}`);
    return { message: 'Resposta da IA gerada e enviada com sucesso' };

  } catch (error) {
    console.error(`[AI Engine Direct] Erro global:`, error);
    return { message: 'Erro interno no AI Engine Direct' };
  }
}
