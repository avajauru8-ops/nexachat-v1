import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
    headers: { 'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY! }
  });
  const spec = await res.json();
  const tables = Object.keys(spec.definitions);
  for (const table of tables) {
    console.log(`Table: ${table}`);
    console.log('Columns:', Object.keys(spec.definitions[table].properties).join(', '));
    console.log('---');
  }
}
main();
