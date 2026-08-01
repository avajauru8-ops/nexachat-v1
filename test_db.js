const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: contacts } = await supabase.from('contacts').select('id, name, custom_fields').eq('ig_scoped_id', '7417061515023976').single();
  console.log(contacts);
}
check();
