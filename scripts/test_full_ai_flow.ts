import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runFullTest() {
  console.log('\n========== TESTE COMPLETO DO FLUXO IA ==========\n');

  // 1. Verificar ai_agent_configs
  console.log('1. Verificando ai_agent_configs...');
  const { data: configs, error: configErr } = await supabase
    .from('ai_agent_configs')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (configErr) {
    console.error('   ERRO ao buscar ai_agent_configs:', configErr.message);
  } else if (!configs) {
    console.warn('   AVISO: Nenhuma configuração de IA encontrada. O motor usará defaults.');
  } else {
    console.log(`   OK: Configuração encontrada - Provider: ${configs.llm_provider}, Model: ${configs.model}`);
  }

  // 2. Verificar chave Gemini no system_settings
  console.log('\n2. Verificando GEMINI_API_KEY no system_settings...');
  const { data: settings } = await supabase
    .from('system_settings')
    .select('key, value')
    .eq('key', 'GEMINI_API_KEY')
    .maybeSingle();

  if (!settings?.value) {
    console.error('   ERRO: GEMINI_API_KEY não encontrada ou vazia!');
  } else {
    console.log(`   OK: Chave encontrada (${settings.value.length} chars), começa com: ${settings.value.substring(0, 8)}...`);
  }

  // 3. Testar chamada Gemini diretamente
  console.log('\n3. Testando API Gemini diretamente...');
  const geminiKey = settings?.value || process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: 'Instruções do sistema: Você é um assistente prestativo.' }] },
              { role: 'model', parts: [{ text: 'Entendido.' }] },
              { role: 'user', parts: [{ text: 'ajuda' }] }
            ]
          })
        }
      );
      const data = await res.json();
      if (data.error) {
        console.error('   ERRO Gemini:', data.error.message);
      } else {
        console.log(`   OK: Gemini respondeu: "${data.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 80)}..."`);
      }
    } catch (err) {
      console.error('   ERRO de rede ao chamar Gemini:', err);
    }
  }

  // 4. Verificar instagram_accounts ativo
  console.log('\n4. Verificando instagram_accounts...');
  const { data: igAccount } = await supabase
    .from('instagram_accounts')
    .select('id, username, status, workspace_id')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (!igAccount) {
    console.error('   ERRO: Nenhuma conta Instagram ativa encontrada!');
  } else {
    console.log(`   OK: Conta @${igAccount.username} ativa (workspace: ${igAccount.workspace_id})`);
  }

  // 5. Verificar conversas em modo 'ai'
  console.log('\n5. Verificando conversas em modo AI...');
  const { data: aiConversations, count } = await supabase
    .from('conversations')
    .select('id, status', { count: 'exact' })
    .eq('status', 'ai')
    .limit(5);

  console.log(`   Conversas em modo 'ai': ${count}`);
  if (aiConversations && aiConversations.length > 0) {
    console.log(`   IDs: ${aiConversations.map(c => c.id).join(', ')}`);
  }

  // 6. Verificar INNGEST_EVENT_KEY
  console.log('\n6. Verificando INNGEST_EVENT_KEY...');
  if (process.env.INNGEST_EVENT_KEY) {
    console.log(`   OK: INNGEST_EVENT_KEY definida (${process.env.INNGEST_EVENT_KEY.length} chars)`);
  } else {
    console.warn('   AVISO: INNGEST_EVENT_KEY não encontrada no .env.local');
    console.warn('   O sistema usará o fallback executeAiDirect (síncrono)');
  }

  console.log('\n========== FIM DO TESTE ==========\n');
}

runFullTest();
