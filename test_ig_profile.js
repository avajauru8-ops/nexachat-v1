const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
  const { data: contacts } = await supabase.from('contacts').select('*').limit(5);
  const contact = contacts[0];
  
  const { data: igAccount } = await supabase
    .from('instagram_accounts')
    .select('access_token')
    .limit(1)
    .single();

  const accessToken = igAccount.access_token;
  const igScopedId = contact.ig_scoped_id;
  
  // Test 1: without biography
  let fields = 'name,username,profile_pic,follower_count,is_verified_user';
  let graphUrl = `https://graph.instagram.com/v22.0/${igScopedId}?fields=${fields}&access_token=${accessToken}`;
  console.log('Fetching without biography...');
  let res = await fetch(graphUrl);
  let data = await res.json();
  console.log('Result 1:', JSON.stringify(data, null, 2));

  // Test 2: minimal fields
  if (data.error) {
    fields = 'name,profile_pic,username';
    graphUrl = `https://graph.instagram.com/v22.0/${igScopedId}?fields=${fields}&access_token=${accessToken}`;
    console.log('\nFetching minimal fields...');
    res = await fetch(graphUrl);
    data = await res.json();
    console.log('Result 2:', JSON.stringify(data, null, 2));
  }
}
testFetch();
