import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testGeminiWithHistory() {
  console.log('=== Teste Gemini com histórico real da conversa ===\n');

  // Buscar a conversa em modo AI
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, workspace_id, status')
    .eq('status', 'ai')
    .maybeSingle();

  if (!conv) {
    console.error('Nenhuma conversa em modo AI encontrada');
    return;
  }
  console.log(`Conversa: ${conv.id} | Status: ${conv.status}`);

  // Buscar mensagens reais
  const { data: messages } = await supabase
    .from('messages')
    .select('sender_type, content')
    .eq('conversation_id', conv.id)
    .order('timestamp', { ascending: false })
    .limit(10);

  const historyMessages = (messages || []).reverse();
  console.log(`\nMensagens no histórico: ${historyMessages.length}`);
  historyMessages.forEach(m => console.log(`  [${m.sender_type}]: "${m.content?.substring(0, 50)}"`));

  // Buscar config
  const { data: aiConfig } = await supabase
    .from('ai_agent_configs')
    .select('*')
    .eq('workspace_id', conv.workspace_id)
    .maybeSingle();

  const { data: settings } = await supabase
    .from('system_settings')
    .select('key, value')
    .eq('key', 'GEMINI_API_KEY')
    .maybeSingle();

  const geminiKey = settings?.value;
  console.log(`\nProvider: ${aiConfig?.llm_provider}, Model: ${aiConfig?.model}`);
  console.log(`Gemini Key: ${geminiKey ? 'presente' : 'AUSENTE'}`);

  // Simular lógica exata do aiEngineDirect
  const cleanHistory = historyMessages
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

  if (geminiContents.length === 0 || geminiContents[geminiContents.length - 1].role !== 'user') {
    geminiContents.push({ role: 'user', parts: [{ text: 'ajuda' }] });
  }

  console.log(`\nConteúdo enviado ao Gemini (${geminiContents.length} turnos):`);
  geminiContents.forEach((c, i) => console.log(`  ${i+1}. [${c.role}]: "${c.parts[0].text.substring(0, 50)}"`));

  const requestBody: Record<string, unknown> = { contents: geminiContents };
  if (aiConfig?.system_prompt?.trim()) {
    requestBody.system_instruction = { parts: [{ text: aiConfig.system_prompt }] };
  }

  const modelId = aiConfig?.model || 'gemini-flash-latest';
  const modelMap: Record<string, string> = {
    'gemini-1.5-flash': 'gemini-flash-latest',
    'gemini-1.5-pro': 'gemini-pro-latest',
  };
  const resolvedModel = modelMap[modelId] || modelId;
  console.log(`\nChamando modelo: ${resolvedModel}...`);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    }
  );

  const data = await res.json();
  if (data.error) {
    console.error('\n✗ ERRO Gemini:', JSON.stringify(data.error, null, 2));
  } else {
    const response = data.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log(`\n✓ SUCESSO! Resposta do Gemini:\n"${response}"`);
  }
}

testGeminiWithHistory();
