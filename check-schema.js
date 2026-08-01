const { createClient } = require('@supabase/supabase-js');

async function testSchemaCols() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase.from('messages').select('id, direction, meta_message_id').limit(1);
  console.log("Result:", data, error);
}

testSchemaCols();
