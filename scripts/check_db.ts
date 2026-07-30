import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function check() {
  const { data: convs, error } = await supabase.from('conversations').select('*');
  console.log("Conversations:", convs, error);
  const { data: msgs, error: msgsErr } = await supabase.from('messages').select('*');
  console.log("Messages count:", msgs?.length, msgsErr);
  const { data: contacts, error: contactsErr } = await supabase.from('contacts').select('*');
  console.log("Contacts count:", contacts?.length, contactsErr);
}
check();
