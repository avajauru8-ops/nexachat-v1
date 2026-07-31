async function subscribe() {
  const igUserId = '27829631633356268';
  const token = 'IGAAZACpEV8heZABZAFo2QWg2ejI0cjJqVmxTcVNxLVFxbWxnQVZAEbXl6Y05jUHY1WVRUenV0NWhMTllWeGF0ZA2FYREszbHpMcDlxN3puM1JYazFCRThBazV2WkhlQWRQdEMtTjBSRFFqMkdZAM3pIMVFla0xwM2pIWWxDU0NyR1EwNEtQWU05WHRpWkpyMFpOQk1mbk5lcQZDZD';
  
  const url = `https://graph.instagram.com/v22.0/${igUserId}/subscribed_apps?subscribed_fields=messages,comments,mentions&access_token=${token}`;
  
  console.log("Subscribing...");
  try {
    const res = await fetch(url, { method: 'POST' });
    const data = await res.json();
    console.log("Response:", data);
  } catch (err) {
    console.error(err);
  }
}
subscribe();
