const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: flows } = await supabase.from('flows').select('id, name, status, trigger_type, trigger_config, triggers').limit(5);
  console.log(JSON.stringify(flows, null, 2));
}
check();
