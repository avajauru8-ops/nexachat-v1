const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: flow } = await supabase
    .from('flows')
    .select('graph_json, flow_data')
    .eq('id', '43003fc5-bba3-455e-80e8-41f5df352e2a')
    .single();
  
  console.log("Graph Data:", JSON.stringify(flow, null, 2));
}
check();
