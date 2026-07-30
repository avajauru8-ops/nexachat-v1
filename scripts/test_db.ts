import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data, error } = await supabase.from('flows').select('id, name, instagram_account_id, triggers, status');
  console.log('flows error:', error);
  console.log('flows data:', JSON.stringify(data, null, 2));
}
main();
