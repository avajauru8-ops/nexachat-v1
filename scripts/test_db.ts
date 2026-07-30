import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data, error } = await supabase.rpc('run_sql', {
    query: `SELECT * FROM pg_policies WHERE tablename = 'flows';`
  });
  if (error) {
    console.log("No RPC");
  } else {
    console.log(data);
  }
}
main();
