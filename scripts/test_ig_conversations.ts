import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function testFetchConversations() {
  const { data: accounts } = await supabase.from('instagram_accounts').select('access_token, ig_user_id').eq('status', 'active');
  
  if (!accounts || accounts.length === 0) {
    console.log("Nenhuma conta do Instagram ativa encontrada no banco.");
    return;
  }

  const account = accounts[0];
  const accessToken = account.access_token;
  
  console.log(`Buscando conversas para a conta ${account.ig_user_id}...`);
  
  // Note: For Instagram Login API, platform=instagram is usually required
  const url = `https://graph.instagram.com/v20.0/me/conversations?platform=instagram&fields=id,updated_time,participants,messages.limit(5){id,created_time,message,from,to}&access_token=${accessToken}`;
  
  const res = await fetch(url);
  const data = await res.json();
  
  console.log(JSON.stringify(data, null, 2));
}

testFetchConversations().catch(console.error);
