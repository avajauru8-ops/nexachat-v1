import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function sendMessageToMeta({
  conversationId,
  content,
  mediaUrl,
  messageType,
  commentId,
  mediaBase64,
  mimeType,
  filename
}: {
  conversationId: string;
  content: string | null;
  mediaUrl?: string | null;
  messageType: string;
  commentId?: string;
  mediaBase64?: string | null;
  mimeType?: string | null;
  filename?: string | null;
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

  let finalMediaUrl: string | null = mediaUrl || null;
  let attachmentId: string | null = null;

  // 2.1 Upload de anexo (imagem/vídeo/áudio) via message_attachments
  if (mediaBase64) {
    const base64Data = mediaBase64.includes(',') ? mediaBase64.split(',')[1] : mediaBase64;
    const binary = Buffer.from(base64Data, 'base64');
    const uploadType: 'image' | 'video' | 'audio' =
      mimeType?.startsWith('video/') ? 'video' : mimeType?.startsWith('audio/') ? 'audio' : 'image';
    const fileName = filename || (uploadType === 'video' ? 'anexo.mp4' : uploadType === 'audio' ? 'voz.m4a' : 'anexo.jpg');

    const form = new FormData();
    form.append('media_type', uploadType);
    form.append('filename', fileName);
    form.append('message', JSON.stringify({
      attachment: { type: uploadType, payload: { is_reusable: true } }
    }));
    form.append('file', new Blob([binary], { type: mimeType || 'application/octet-stream' }), fileName);

    const uploadRes = await fetch(`https://graph.instagram.com/v22.0/me/message_attachments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${pageAccessToken}` },
      body: form
    });

    const uploadData = await uploadRes.json();

    if (uploadData.error) {
      throw new Error(uploadData.error.message || 'Erro ao enviar anexo para o Instagram');
    }

    attachmentId = uploadData.id || null;
    if (uploadData.uri) finalMediaUrl = uploadData.uri;
    messageType = uploadType;
  }

  const metaBody: any = {
    recipient: commentId ? { comment_id: commentId } : { id: igScopedId }
  };

  if (attachmentId) {
    metaBody.message = {
      attachment: {
        type: messageType,
        payload: { attachment_id: attachmentId }
      }
    };
  } else if (finalMediaUrl) {
    metaBody.message = {
      attachment: {
        type: messageType === 'video' ? 'video' : 'image',
        payload: { url: finalMediaUrl }
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
      message_type: finalMediaUrl || attachmentId ? messageType : 'text',
      content: content || null,
      media_url: finalMediaUrl || null,
      metadata: attachmentId ? { attachment_id: attachmentId } : null
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
