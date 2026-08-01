import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function sendMessageToMeta({
  conversationId,
  content,
  mediaUrl,
  messageType
}: {
  conversationId: string;
  content: string | null;
  mediaUrl: string | null;
  messageType: string;
}) {
  // 1. Buscar a conversation e os IDs necessários
  const { data: conversation, error: convError } = await supabaseAdmin
    .from('conversations')
    .select(`
      id,
      contact_id,
      contacts (
        ig_scoped_id,
        instagram_account_id,
        instagram_accounts (
          ig_user_id,
          access_token
        )
      )
    `)
    .eq('id', conversationId)
    .single();

  if (convError || !conversation) {
    throw new Error('Conversa não encontrada');
  }

  const rawContact = Array.isArray(conversation.contacts) ? conversation.contacts[0] : conversation.contacts;
  const contact = rawContact as any;
  
  const rawAccount = Array.isArray(contact?.instagram_accounts) ? contact?.instagram_accounts[0] : contact?.instagram_accounts;
  const igAccount = rawAccount as any;

  const igScopedId = contact?.ig_scoped_id;
  const pageAccessToken = igAccount?.access_token;

  if (!igScopedId || !pageAccessToken) {
    throw new Error('Dados da conta/contato incompletos para disparo');
  }

  // 2. Disparar para a Meta API
  const metaUrl = `https://graph.instagram.com/v22.0/me/messages`;
  
  const metaBody: any = {
    recipient: { id: igScopedId }
  };

  if (mediaUrl) {
    metaBody.message = {
      attachment: {
        type: messageType === 'video' ? 'video' : 'image',
        payload: { url: mediaUrl }
      }
    };
  } else {
    metaBody.message = { text: content };
  }

  const metaRes = await fetch(metaUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${pageAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metaBody)
  });

  const metaData = await metaRes.json();

  if (metaData.error) {
    throw new Error(metaData.error.message || 'Erro ao enviar pela Meta');
  }

  // 3. Salvar no banco
  const { data: messageData, error: msgError } = await supabaseAdmin
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_type: 'bot', // Will be 'human_agent' if called from frontend, we can parameterize this later if needed. Default bot.
      message_type: mediaUrl ? (messageType === 'video' ? 'video' : 'image') : 'text',
      content: content || null,
      media_url: mediaUrl || null
    })
    .select()
    .single();

  if (msgError) {
    throw new Error('Erro ao salvar a mensagem no banco');
  }

  // 4. Atualizar last_interaction
  await supabaseAdmin.from('conversations').update({ last_interaction_at: new Date().toISOString() }).eq('id', conversationId);

  return messageData;
}
