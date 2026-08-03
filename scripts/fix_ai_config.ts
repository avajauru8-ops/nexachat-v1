import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fix() {
  console.log('=== Corrigindo configurações do AI Agent ===\n');

  // 1. Corrigir o model no ai_agent_configs
  const { data: config } = await supabase
    .from('ai_agent_configs')
    .select('id, llm_provider, model')
    .limit(1)
    .maybeSingle();

  if (config) {
    const { error } = await supabase
      .from('ai_agent_configs')
      .update({
        llm_provider: 'gemini',
        model: 'gemini-flash-latest'
      })
      .eq('id', config.id);

    if (error) {
      console.error('Erro ao atualizar ai_agent_configs:', error.message);
    } else {
      console.log(`OK: ai_agent_configs atualizado - model: gemini-1.5-flash → gemini-flash-latest`);
    }
  } else {
    console.log('Nenhum ai_agent_config encontrado para atualizar');
  }

  // 2. Verificar instagram_accounts e seu status
  console.log('\n=== Verificando status das contas Instagram ===');
  const { data: allAccounts } = await supabase
    .from('instagram_accounts')
    .select('id, username, status, workspace_id, access_token');

  if (!allAccounts || allAccounts.length === 0) {
    console.error('CRÍTICO: Nenhuma conta Instagram encontrada no banco!');
  } else {
    console.log(`Contas encontradas: ${allAccounts.length}`);
    for (const acc of allAccounts) {
      console.log(`  - @${acc.username} | status: ${acc.status} | token: ${acc.access_token ? 'presente' : 'AUSENTE'}`);
    }

    // Se há contas mas nenhuma 'active', ativar a primeira
    const activeAccount = allAccounts.find(a => a.status === 'active');
    if (!activeAccount && allAccounts.length > 0) {
      console.log('\n⚠️  Nenhuma conta ativa. Ativando a primeira conta encontrada...');
      const { error } = await supabase
        .from('instagram_accounts')
        .update({ status: 'active' })
        .eq('id', allAccounts[0].id);

      if (error) {
        console.error('Erro ao ativar conta:', error.message);
      } else {
        console.log(`OK: Conta @${allAccounts[0].username} ativada!`);
      }
    }
  }

  console.log('\n=== Conclusão ===');
  console.log('Correções aplicadas. Rode o teste completo novamente para verificar.');
}

fix();
