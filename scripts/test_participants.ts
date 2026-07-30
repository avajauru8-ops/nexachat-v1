import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function testParticipants() {
  const { data: accounts } = await supabase.from('instagram_accounts').select('*').limit(1);
  const account = accounts![0];
  const url = `https://graph.instagram.com/v20.0/me/conversations?platform=instagram&fields=id,participants&access_token=${account.access_token}`;
  
  const res = await fetch(url);
  const data = await res.json();
  console.log("My IG User ID:", account.ig_user_id);
  console.log("Conversations:", JSON.stringify(data.data.slice(0, 3), null, 2));
}

testParticipants();
