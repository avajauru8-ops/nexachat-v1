import fetch from 'node-fetch';
import crypto from 'crypto';

async function testWebhook() {
  const payload = JSON.stringify({
    object: "instagram",
    entry: [{
      id: "17841425588804605",
      time: Date.now(),
      messaging: [{
        sender: { id: "1234567890" },
        recipient: { id: "17841425588804605" },
        timestamp: Date.now(),
        message: {
          mid: "test_mid",
          text: "Top"
        }
      }]
    }]
  });

  const appSecret = "e461efcf1d7c3bc784f10738092bd9d5"; // From env or whatever. Actually, without signature it might fail?
  // Let's just bypass signature or check if webhook route accepts it.
  // Wait, I can call processMetaPayload directly in a script instead of going through the webhook!
}
testWebhook();
