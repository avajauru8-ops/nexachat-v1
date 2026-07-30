import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function testRealtime() {
  console.log("Listening to realtime messages...");
  
  const channel = supabase.channel('schema-db-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      (payload) => console.log("Realtime payload received!", payload)
    )
    .subscribe((status) => {
      console.log("Subscription status:", status);
      
      if (status === 'SUBSCRIBED') {
        console.log("Inserting a dummy message to trigger event...");
        supabase.from('conversations').select('id').limit(1).single().then(({data}) => {
          if (data) {
            supabase.from('messages').insert({
              conversation_id: data.id,
              sender_type: 'bot',
              message_type: 'text',
              content: 'Test realtime message'
            }).then(res => console.log("Insert result:", res));
          }
        });
      }
    });
}

testRealtime();
