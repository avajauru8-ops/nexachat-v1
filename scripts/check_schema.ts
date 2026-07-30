import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  // Query Supabase via REST directly to fetch a single row to inspect keys using Service Role (bypassing RLS)
  const tables = ['messages', 'conversations', 'contacts', 'instagram_accounts'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    console.log(`\nTable ${table}:`);
    if (error) {
      console.error(error);
    } else if (data && data.length > 0) {
      console.log(Object.keys(data[0]));
    } else {
      console.log('No rows found, cannot infer schema this way.');
    }
  }
}

checkSchema().catch(console.error);
