import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function testApi() {
  const { data: accounts } = await supabase.from('instagram_accounts').select('*').limit(1)
  const acc = accounts![0];
  const url = `https://graph.instagram.com/v20.0/${acc.ig_user_id}?fields=username,profile_picture_url&access_token=${acc.access_token}`;
  console.log("Calling API:", url)
  const res = await fetch(url)
  const data = await res.json()
  console.log("Data:", data)
}
testApi()
