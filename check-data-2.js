import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkData() {
  const { data: users } = await supabase.auth.admin.listUsers();
  const eber = users?.users.find(u => u.email === 'eber@nexachat.com');
  if (!eber) return console.log("User eber@nexachat.com not found!");

  const { data: workspace } = await supabase.from('workspaces').select('id').eq('user_id', eber.id).single();
  if (!workspace) return console.log("Workspace not found!");

  const { data: logs } = await supabase.from('events_log').select('id, event_type, created_at, raw_payload').eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(2);
  console.log("Recent Webhook Logs:", logs);

  const { data: messages } = await supabase.from('messages').select('id, content, sender_type, timestamp, conversations(id, contact_id)').order('timestamp', { ascending: false }).limit(2);
  console.log("Recent Messages:", messages);
}

checkData();
