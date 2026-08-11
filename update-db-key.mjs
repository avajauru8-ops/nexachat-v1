import { createClient } from '@supabase/supabase-js';
import dotenv from "dotenv";
dotenv.config({path: ".env.local"});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAndUpdate() {
  const newKey = process.env.GEMINI_API_KEY || "your_api_key_here";
  
  console.log("Testando chave na API do Google...");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=` + newKey, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      contents: [{ role: "user", parts: [{ text: "oi, tudo bem?" }] }],
    })
  });
  const result = await res.json();
  if (result.error) {
    console.log("ERRO AO TESTAR A CHAVE:", JSON.stringify(result.error));
  } else {
    console.log("SUCESSO! Resposta:", result.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 50));
    
    // Atualiza no system_settings
    console.log("Atualizando system_settings...");
    const { error: sysError } = await supabase.from('system_settings')
      .update({ value: newKey })
      .eq('key', 'GEMINI_API_KEY');
      
    if (sysError) console.log("Erro ao atualizar system_settings:", sysError);
    else console.log("system_settings atualizado!");
    
    // Como a chave parece ser global, podemos atualizar todos os workspaces em ai_agent_configs também, se estiver vazio
    console.log("Atualizando ai_agent_configs que estiverem vazios...");
    const { error: aiError } = await supabase.from('ai_agent_configs')
      .update({ gemini_api_key: newKey })
      .is('gemini_api_key', null);
      
    if (aiError) console.log("Erro ai_agent_configs:", aiError);
    else console.log("ai_agent_configs atualizado!");
  }
}
testAndUpdate();
