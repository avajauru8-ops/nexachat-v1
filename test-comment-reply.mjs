import { createClient } from '@supabase/supabase-js';
import dotenv from "dotenv";
dotenv.config({path: ".env.local"});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: logs } = await supabase.from('events_log').select('raw_payload').eq('event_type', 'comment').order('created_at', { ascending: false }).limit(1);
  if (logs && logs.length > 0) {
    const payload = logs[0].raw_payload;
    const entry = payload.entry[0];
    const change = entry.changes[0];
    const commentId = change.value.id;
    const text = change.value.text;
    const recipientId = entry.id;
    
    console.log("Found comment:", { commentId, text, recipientId });
    
    const { data: account } = await supabase
      .from('instagram_accounts')
      .select('access_token')
      .or(`ig_user_id.eq.${recipientId},page_id.eq.${recipientId}`)
      .limit(1)
      .single();
      
    if (account) {
      console.log("Token starts with:", account.access_token.substring(0, 5));
      const url = `https://graph.facebook.com/v22.0/${commentId}/replies`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: "Teste de resposta ao comentário!" })
      });
      const data = await res.json();
      console.log("Meta Response:", data);
    }
  } else {
    console.log("No comments found in events_log");
  }
}
check();
