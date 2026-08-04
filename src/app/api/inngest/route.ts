import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { processWebhookEvent, processAiAgent } from '@/inngest/functions';
import { executeFlow } from '@/inngest/flowEngine';
import { processBroadcast } from '@/inngest/broadcaster';
import { publishScheduledPosts } from '@/inngest/scheduler';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processWebhookEvent,
    processAiAgent,
    executeFlow,
    processBroadcast,
    publishScheduledPosts
  ],
});
