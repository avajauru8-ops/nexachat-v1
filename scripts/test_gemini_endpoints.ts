import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const geminiKey = 'AIzaSyCfhYF0ikFYemMioPhhZ24VMXtNY_eUtbU';
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`;
  console.log('Fetching models...');
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log(data.models.map((m: any) => m.name));
  } catch (err) {
    console.error(err);
  }
}

run();
