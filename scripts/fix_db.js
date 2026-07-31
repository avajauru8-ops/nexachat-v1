require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY);
async function run() {
  await supabase.from('system_settings').upsert({ key: 'META_APP_ID', value: '4360411140866985' });
  await supabase.from('system_settings').upsert({ key: 'META_APP_SECRET', value: '822e4e7a91e3d8803a85bae1018cb670' });
  console.log('Updated DB');
}
run();
