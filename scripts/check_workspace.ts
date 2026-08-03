import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const igAccount = await supabase.from('instagram_accounts').select('workspace_id, ig_username, status').maybeSingle();
  const aiConfig = await supabase.from('ai_agent_configs').select('workspace_id, llm_provider, model').maybeSingle();
  const conversation = await supabase.from('conversations').select('id, workspace_id, status').eq('status', 'ai').maybeSingle();
  
  console.log('Instagram account workspace_id:', igAccount.data?.workspace_id);
  console.log('AI config workspace_id:', aiConfig.data?.workspace_id);
  console.log('AI conversation workspace_id:', conversation.data?.workspace_id);
  console.log('Provider:', aiConfig.data?.llm_provider, '| Model:', aiConfig.data?.model);
  
  const match = igAccount.data?.workspace_id === aiConfig.data?.workspace_id;
  console.log('\nWorkspace IDs match?', match ? '✓ SIM' : '✗ NÃO - ESTE É O PROBLEMA!');
}
check();
