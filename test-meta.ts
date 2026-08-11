import { processMetaPayload } from './src/utils/webhookProcessor';
import dotenv from "dotenv";
dotenv.config({path: ".env.local"});

// Mock inngest
import { inngest } from './src/inngest/client';
// @ts-ignore
inngest.send = async (evt) => {
  console.log("Inngest send mock:", JSON.stringify(evt));
};

async function test() {
  const payload = {
    object: "instagram",
    entry: [{
      id: "17841425588804605",
      time: Date.now(),
      messaging: [{
        sender: { id: "1234567890" }, // dummy user
        recipient: { id: "17841425588804605" },
        timestamp: Date.now(),
        message: {
          mid: "test_mid_" + Date.now(),
          text: "Top" // keyword
        }
      }]
    }]
  };
  await processMetaPayload(payload);
  console.log("Done");
}
test();
