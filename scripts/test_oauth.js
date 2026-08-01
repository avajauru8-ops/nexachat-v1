const fetch = require('node-fetch');

async function testOAuthUrl(appId) {
  const url = `https://www.instagram.com/oauth/authorize?force_reauth=true&client_id=${appId}&redirect_uri=https://nexachat-v1.vercel.app/api/auth/meta/callback&response_type=code&scope=instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments`;
  
  console.log(`Testing App ID: ${appId}`);
  console.log(`URL: ${url}`);
  
  try {
    const res = await fetch(url, { redirect: 'manual' });
    console.log(`Status: ${res.status}`);
    console.log(`Location Header (if any):`, res.headers.get('location'));
    const text = await res.text();
    if (text.includes('Invalid platform app') || text.includes('error')) {
      console.log('Result: FAILED (Has error message in body/headers)');
    } else {
      console.log('Result: SUCCESS (No platform error detected)');
    }
  } catch(e) {
    console.log('Fetch error:', e);
  }
  console.log('-----------------------------------');
}

async function run() {
  await testOAuthUrl('4360411140866985'); // The OLD bad ID (should fail or redirect to error)
  await testOAuthUrl('1762123168122342'); // The NEW good ID (should succeed / show login)
}

run();
