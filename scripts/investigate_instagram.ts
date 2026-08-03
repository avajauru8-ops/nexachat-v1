import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function investigate() {
  console.log('=== Investigando contas Instagram ===\n');

  // Try without status filter
  const { data: allAccounts, error } = await supabase
    .from('instagram_accounts')
    .select('*');

  if (error) {
    console.error('Erro ao buscar contas:', error.message);
    return;
  }
  
  console.log('Todas as contas encontradas:', allAccounts?.length || 0);
  if (allAccounts && allAccounts.length > 0) {
    console.log(JSON.stringify(allAccounts, null, 2));
  }

  // Also check workspaces
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, name');
  
  console.log('\nWorkspaces:', JSON.stringify(workspaces, null, 2));

  // Check system_settings for access token storage
  const { data: settings } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', ['INSTAGRAM_ACCESS_TOKEN', 'META_ACCESS_TOKEN', 'PAGE_ACCESS_TOKEN']);

  console.log('\nSystem settings (tokens):', JSON.stringify(settings, null, 2));
}

investigate();
