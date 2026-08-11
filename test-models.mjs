import fetch from 'node-fetch';

async function list() {
  const newKey = process.env.GEMINI_API_KEY || "your_api_key_here";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=` + newKey);
  const data = await res.json();
  if (data.models) {
    data.models.forEach(m => console.log(m.name));
  } else {
    console.log("Erro:", data);
  }
}
list();
