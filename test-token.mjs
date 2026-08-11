import { createClient } from '@supabase/supabase-js';
import dotenv from "dotenv";
dotenv.config({path: ".env.local"});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: account } = await supabase
    .from('instagram_accounts')
    .select('access_token')
    .limit(1)
    .single();
    
  if (account) {
    console.log("Token starts with:", account.access_token.substring(0, 5));
  } else {
    console.log("No accounts found");
  }
}
check();
