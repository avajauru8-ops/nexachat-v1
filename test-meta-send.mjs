import { createClient } from '@supabase/supabase-js';
import dotenv from "dotenv";
dotenv.config({path: ".env.local"});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testMetaSend() {
  // Let's get the latest message to find the conversation
  const { data: latestMsgs } = await supabase.from('messages').select('conversation_id').order('timestamp', { ascending: false }).limit(1);
  const conversationId = latestMsgs[0].conversation_id;

  const { data: conversation } = await supabase
    .from('conversations')
    .select(`
      id,
      contact_id,
      contacts (
        ig_scoped_id,
        instagram_accounts (
          access_token
        )
      )
    `)
    .eq('id', conversationId)
    .single();

  const rawContact = Array.isArray(conversation.contacts) ? conversation.contacts[0] : conversation.contacts;
  const igScopedId = rawContact?.ig_scoped_id;
  
  const rawAccount = Array.isArray(rawContact?.instagram_accounts) ? rawContact?.instagram_accounts[0] : rawContact?.instagram_accounts;
  const accessToken = rawAccount?.access_token;

  if (!igScopedId || !accessToken) {
    console.log("No ID or Token found", {igScopedId, accessToken});
    return;
  }

  console.log("Sending to", igScopedId);
  const graphHost = accessToken.startsWith('EAA') ? 'graph.facebook.com' : 'graph.instagram.com';
  
  const res = await fetch(`https://${graphHost}/v22.0/me/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      recipient: { id: igScopedId },
      message: { text: "Mensagem de teste de diagnóstico." }
    })
  });

  const result = await res.json();
  console.log("Meta API Response:", result);
}
testMetaSend();
