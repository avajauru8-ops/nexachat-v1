import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data, error } = await supabase.from('flows').select('*').limit(0);
  console.log(data); // This doesn't show schema.
  
  // Let's use raw REST API to get swagger spec to see columns
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
    headers: { 'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY! }
  });
  const spec = await res.json();
  const flowProps = spec.definitions.flows.properties;
  console.log('flows columns:', Object.keys(flowProps));
}
main();
