import { createClient } from '@supabase/supabase-js';
import dotenv from "dotenv";
dotenv.config({path: ".env.local"});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  // Get all ai_agent_configs
  const { data: configs } = await supabase.from('ai_agent_configs').select('*').limit(10);
  console.log("Configurações de IA na base de dados:");
  for (const c of configs || []) {
    const keyPreview = c.gemini_api_key ? c.gemini_api_key.substring(0, 5) + '...' : 'null';
    console.log(`- Workspace ${c.workspace_id} | Model: ${c.model} | Key: ${keyPreview}`);
    
    if (c.gemini_api_key) {
      // Test the key
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=` + c.gemini_api_key, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          contents: [{ role: "user", parts: [{ text: "oi" }] }],
        })
      });
      const result = await res.json();
      if (result.error) {
        console.log("   ERRO:", JSON.stringify(result.error));
      } else {
        console.log("   SUCESSO! Modelo respondeu.");
      }
    }
  }

  // Get conversations in AI status
  const { data: convs } = await supabase.from('conversations').select('id, status, active_flow_id').eq('status', 'ai').limit(5);
  console.log("\nConversas presas no status 'ai':");
  console.log(convs);
}
check();
