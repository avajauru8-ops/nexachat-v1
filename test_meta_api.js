const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data: contact } = await supabase
    .from('contacts')
    .select('id, ig_scoped_id, workspace_id, custom_fields')
    .not('custom_fields->>username', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!contact) {
    console.log('Nenhum contato com username encontrado');
    return;
  }

  console.log('Contato:', contact);

  const { data: account } = await supabase
    .from('instagram_accounts')
    .select('access_token, ig_user_id')
    .eq('workspace_id', contact.workspace_id)
    .limit(1)
    .single();

  if (!account) return;

  const accessToken = account.access_token;
  const isMetaToken = accessToken.startsWith('EAA');
  const domain = isMetaToken ? 'graph.facebook.com' : 'graph.instagram.com';
  
  console.log('\n--- Test 1: Scoped ID ---');
  const url1 = `https://${domain}/v22.0/${contact.ig_scoped_id}?fields=name,username,profile_pic,follower_count,is_verified_user&access_token=${accessToken}`;
  const res1 = await fetch(url1);
  const data1 = await res1.json();
  console.log(data1);

  console.log('\n--- Test 2: Business Discovery ---');
  const username = contact.custom_fields.username;
  const url2 = `https://graph.facebook.com/v22.0/${account.ig_user_id}?fields=business_discovery.username(${username}){followers_count,is_verified,biography}&access_token=${accessToken}`;
  const res2 = await fetch(url2);
  const data2 = await res2.json();
  console.log(JSON.stringify(data2, null, 2));
}

test();
