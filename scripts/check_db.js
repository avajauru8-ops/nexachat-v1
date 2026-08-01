require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: accounts, error } = await supabase.from('instagram_accounts').select('*');
  console.log('Accounts:', accounts);
  if (error) console.log('Error:', error);
}
run();
