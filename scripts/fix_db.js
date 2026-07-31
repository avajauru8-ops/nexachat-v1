require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY);
async function run() {
  await supabase.from('system_settings').upsert({ key: 'META_APP_ID', value: '1762123168122342' });
  await supabase.from('system_settings').upsert({ key: 'META_APP_SECRET', value: '717ea4b8e025223a6e314725369d76a5' });
  console.log('Restored Instagram Native App ID and Secret');
}
run();
