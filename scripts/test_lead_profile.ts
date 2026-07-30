import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function testLeadProfile() {
  const { data: accounts } = await supabase.from('instagram_accounts').select('*').limit(1);
  const account = accounts![0];
  
  // Test with one of the lead IDs found previously, e.g. cebrindes: 24954811020800351
  const leadId = '24954811020800351';
  const url = `https://graph.instagram.com/v20.0/${leadId}?fields=profile_pic,username,name&access_token=${account.access_token}`;
  
  const res = await fetch(url);
  const data = await res.json();
  console.log("Lead Data:", data);
}

testLeadProfile();
