import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) { console.error('Missing env'); return; }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data } = await supabase.from('instagram_accounts').select('*');
  console.log('Instagram Accounts:', JSON.stringify(data, null, 2));
}
main();
