import { createClient } from '@supabase/supabase-js';
import dotenv from "dotenv";
dotenv.config({path: ".env.local"});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: latestMsgs } = await supabase.from('messages').select('content').eq('sender_type', 'ai').order('timestamp', { ascending: false }).limit(1);
  if (latestMsgs && latestMsgs.length > 0) {
    const text = latestMsgs[0].content;
    console.log("Length:", text.length);
    console.log("Content:");
    console.log(text);
  } else {
    console.log("No AI messages found");
  }
}
check();
