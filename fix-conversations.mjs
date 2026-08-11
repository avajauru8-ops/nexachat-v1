import { createClient } from '@supabase/supabase-js';
import dotenv from "dotenv";
dotenv.config({path: ".env.local"});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  const { data, error } = await supabase
    .from('conversations')
    .update({ status: 'bot' })
    .eq('status', 'ai');
    
  if (error) {
    console.error("Erro ao consertar conversas:", error);
  } else {
    console.log("Conversas resetadas para 'bot' com sucesso!");
  }
}
fix();
