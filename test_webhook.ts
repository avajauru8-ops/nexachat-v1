import { processMetaPayload } from './src/utils/webhookProcessor';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: '.env.local' });

async function run() {
  const payload = {
    object: "instagram",
    entry: [
      {
        id: "17841425588804605",
        time: Math.floor(Date.now() / 1000),
        changes: [
          {
            field: "comments",
            value: {
              item: 'comment',
              from: {
                id: "9999999999999",
                username: "test_lead_commenter"
              },
              id: "comment_" + Date.now(),
              text: "Eu quero saber mais",
              media: {
                id: "1234567890"
              }
            }
          }
        ]
      }
    ]
  };

  console.log("Processando payload simulado...");
  await processMetaPayload(payload);
  console.log("Fim do processamento!");
}

run().catch(console.error);
