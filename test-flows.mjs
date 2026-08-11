import { createClient } from '@supabase/supabase-js';
import dotenv from "dotenv";
dotenv.config({path: ".env.local"});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data } = await supabase.from('flows').select('id, name, status, graph_json').eq('status', 'active');
  for (const f of data || []) {
    const hasAiNode = JSON.stringify(f.graph_json).includes('aiHandoffNode');
    console.log(`Flow: ${f.name} - Has AI Node: ${hasAiNode}`);
  }
}
check();
