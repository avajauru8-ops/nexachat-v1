const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: convs } = await supabase
    .from('conversations')
    .select('id, contact_id, status, active_flow_id, flow_cursor, last_interaction_at')
    .order('last_interaction_at', { ascending: false })
    .limit(1);
  
  if (convs && convs.length > 0) {
    const { data: msgs, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convs[0].id);
    console.log("Messages Error:", error);
    console.log("Messages Data:", JSON.stringify(msgs, null, 2));
  }
}
check();
