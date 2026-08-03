import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const geminiKey = 'AIzaSyCfhYF0ikFYemMioPhhZ24VMXtNY_eUtbU';
  
  const { data, error } = await supabase
    .from('system_settings')
    .upsert(
      { key: 'GEMINI_API_KEY', value: geminiKey },
      { onConflict: 'key' }
    );
    
  if (error) {
    console.error('Error updating key:', error);
  } else {
    console.log('Successfully updated GEMINI_API_KEY to:', geminiKey);
  }
}

run();
