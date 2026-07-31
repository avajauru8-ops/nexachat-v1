import { Inngest } from 'inngest';

// Definição de eventos fortemente tipados do Inngest
export type Events = {
  'instagram/event.received': {
    data: {
      eventId: string | null;
      workspaceId: string | null;
      recipientId: string | null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload: any;
    };
  };
  'instagram/webhook.received': {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
  };
  'flow/execute': {
    data: {
      workspaceId: string;
      contactId: string;
      conversationId: string;
      recipientId: string;
      senderId: string;
      flowId: string;
      nodeId: string;
    };
  };
  'ai/process': {
    data: {
      workspaceId: string;
      conversationId: string;
      contactId: string;
      senderId: string;
      recipientId: string;
      userMessageText: string;
    };
  };
  'broadcast/send': {
    data: {
      workspaceId: string;
      tagId: string;
      messageText: string;
    };
  };
};

export const inngest = new Inngest({
  id: 'nexachat-app',
  eventKey: process.env.INNGEST_EVENT_KEY || 'local'
});
