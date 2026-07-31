require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY);
async function run() {
  const { data: workspace } = await supabase.from('workspaces').select('id').limit(1).single();
  const { error: dbError } = await supabase.from('instagram_accounts').upsert({
    workspace_id: workspace.id,
    ig_user_id: '123456789',
    page_id: 'native_ig_login',
    access_token: 'mock_token_abc123',
    username: 'testuser',
    status: 'active'
  }, { onConflict: 'ig_user_id' });
  console.log('Insert error:', dbError);
}
run();
