import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function resetDB() {
  console.log("Deletando mensagens...");
  await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Deletando conversas...");
  await supabase.from('conversations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Deletando contatos...");
  await supabase.from('contacts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Reset completo!");
}

resetDB();
