import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data, error } = await supabase.rpc('run_sql', {
    query: `
      SELECT pg_get_constraintdef(oid) 
      FROM pg_constraint 
      WHERE conname = 'flows_status_check';
    `
  });
  if (error) {
    console.log("RPC error:", error.message);
  } else {
    console.log(data);
  }
}
main();
