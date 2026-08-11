import { createClient } from '@supabase/supabase-js';
import dotenv from "dotenv";
dotenv.config({path: ".env.local"});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data } = await supabase.from('messages').select('sender_type, content, message_type, timestamp').order('timestamp', { ascending: false }).limit(20);
  console.log(data);
  const { data: convs } = await supabase.from('conversations').select('id, status, active_flow_id').order('last_interaction_at', { ascending: false }).limit(5);
  console.log("\nConversations:", convs);
}
check();
