import { createClient } from '@supabase/supabase-js';
import dotenv from "dotenv";
dotenv.config({path: ".env.local"});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: msgs } = await supabase.from('messages').select('meta_message_id, content, conversations!inner(contact_id, workspace_id)').eq('message_type', 'comment').eq('direction', 'inbound').order('created_at', { ascending: false }).limit(1);
  if (msgs && msgs.length > 0) {
    const commentId = msgs[0].meta_message_id;
    const workspaceId = msgs[0].conversations.workspace_id;
    
    console.log("Found comment:", { commentId, text: msgs[0].content });
    
    const { data: account } = await supabase
      .from('instagram_accounts')
      .select('access_token')
      .eq('workspace_id', workspaceId)
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
    console.log("No comments found in messages");
  }
}
check();
