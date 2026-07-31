import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // using service role
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // 1. Get first workspace
  const { data: workspaces } = await supabase.from('workspaces').select('id').limit(1);
  if (!workspaces || workspaces.length === 0) return console.log('No workspace found with service role');
  const workspaceId = workspaces[0].id;

  // 2. Insert mock IG Account
  const { data: account, error: accErr } = await supabase.from('instagram_accounts').upsert({
    workspace_id: workspaceId,
    ig_user_id: 'mock_ig_123',
    page_id: 'mock_page',
    access_token: 'mock_token',
    status: 'active'
  }, { onConflict: 'ig_user_id' }).select('id').single();
  
  if (accErr) return console.error(accErr);

  // 3. Insert mock Contact
  const { data: contact, error: cErr } = await supabase.from('contacts').upsert({
    workspace_id: workspaceId,
    instagram_account_id: account.id,
    ig_scoped_id: 'user_456',
    name: 'João Silva',
    profile_picture: 'https://i.pravatar.cc/150?u=joao'
  }, { onConflict: 'instagram_account_id,ig_scoped_id' }).select('id').single();

  if (cErr) return console.error(cErr);

  // 4. Insert mock Conversation
  const { data: conv, error: convErr } = await supabase.from('conversations').insert({
    workspace_id: workspaceId,
    contact_id: contact.id,
    status: 'paused_for_human',
    last_interaction_at: new Date().toISOString(),
    window_expires_at: new Date(Date.now() + 24*60*60*1000).toISOString()
  }).select('id').single();

  if (convErr) return console.error(convErr);

  // 5. Insert mock Messages
  await supabase.from('messages').insert([
    {
      conversation_id: conv.id,
      sender_type: 'user',
      message_type: 'text',
      content: 'Olá! Gostaria de saber mais sobre os planos.',
      timestamp: new Date(Date.now() - 60000).toISOString()
    },
    {
      conversation_id: conv.id,
      sender_type: 'bot',
      message_type: 'text',
      content: 'Olá João! Temos planos mensais e anuais. Qual você prefere?',
      timestamp: new Date(Date.now() - 30000).toISOString()
    }
  ]);

  console.log('Mock Data inserted successfully!');
}
main();
