const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function clean() {
  console.log('Fetching instagram accounts...');
  const { data, error } = await supabase.from('instagram_accounts').select('*');
  if (error) {
    console.error('Error fetching:', error);
    return;
  }
  
  console.log('Found', data.length, 'accounts.');
  for (const acc of data) {
    console.log(`- ID: ${acc.id} | User: ${acc.ig_username} | IG ID: ${acc.ig_user_id} | Page ID: ${acc.page_id}`);
    
    // Deletar mocks e a conta sem username se tiver o eberoficiall
    if (acc.ig_user_id.includes('ig_mock') || !acc.ig_username) {
       console.log(`DELETING invalid/mock account: ${acc.ig_user_id}`);
       await supabase.from('instagram_accounts').delete().eq('id', acc.id);
    }
  }
  console.log('Cleanup complete.');
}

clean();
