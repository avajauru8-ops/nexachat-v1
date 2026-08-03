import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('Testing AI settings from DB...');
  
  const { data: adminSettings, error } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', ['GEMINI_API_KEY', 'OPENAI_API_KEY']);
    
  if (error) {
    console.error('Error fetching admin settings:', error);
    return;
  }
  
  console.log('Admin settings fetched:', adminSettings);
  
  const settingsMap = (adminSettings || []).reduce((acc: any, curr: any) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});

  const dbGeminiKey = settingsMap['GEMINI_API_KEY'];
  console.log('DB Gemini Key length:', dbGeminiKey ? dbGeminiKey.length : 0);
  
  if (!dbGeminiKey) {
    console.error('No GEMINI_API_KEY found in DB');
    return;
  }

  console.log('Calling Gemini API...');
  
  const geminiKey = dbGeminiKey;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        { role: 'user', parts: [{ text: 'Hello, testing Gemini API!' }] }
      ]
    })
  });
  
  const geminiData = await res.json();
  if (geminiData.error) {
    console.error('Gemini API Error:', geminiData.error);
  } else {
    console.log('Gemini response:', geminiData.candidates?.[0]?.content?.parts?.[0]?.text);
  }
}

run();
