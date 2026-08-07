import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { chunkText } from '../utils/chunkText';

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
  filename,
  quickReplies,
  externalAttachmentId
}: {
  conversationId: string;
  content: string | null;
  mediaUrl?: string | null;
  messageType: string;
  commentId?: string;
  mediaBase64?: string | null;
  mimeType?: string | null;
  filename?: string | null;
  quickReplies?: { title: string; payload?: string }[];
  externalAttachmentId?: string | null;
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
  // Tokens do tipo Meta (EAA...) usam graph.facebook.com; tokens nativos usam graph.instagram.com
  const graphHost = pageAccessToken.startsWith('EAA') ? 'graph.facebook.com' : 'graph.instagram.com';
  const metaUrl = `https://${graphHost}/v22.0/me/messages`;

  let finalMediaUrl: string | null = mediaUrl || null;
  let attachmentId: string | null = externalAttachmentId || null;

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

    const uploadRes = await fetch(`https://${graphHost}/v22.0/me/message_attachments`, {
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

  // Se for apenas texto longo, divide em chunks
  if (!attachmentId && !finalMediaUrl && content && content.length > 950) {
    const chunks = chunkText(content, 950);
    // Envia todos menos o último chunk (sem botões)
    for (let i = 0; i < chunks.length - 1; i++) {
      const tempBody = { ...metaBody, message: { text: chunks[i] } };
      const tempRes = await fetch(metaUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pageAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tempBody)
      });
      const tempData = await tempRes.json();
      if (tempData.error) {
        throw new Error(tempData.error.message || 'Erro ao enviar chunk pela Meta');
      }
    }
    // O último chunk será enviado pelo fluxo normal (podendo ter botões)
    content = chunks[chunks.length - 1];
  }

  if (attachmentId) {
    metaBody.message = {
      attachment: {
        type: messageType,
        payload: { attachment_id: attachmentId }
      }
    };
  } else if (finalMediaUrl) {
    const attType = messageType === 'video' ? 'video' : messageType === 'file' ? 'file' : 'image';
    metaBody.message = {
      attachment: {
        type: attType,
        payload: { url: finalMediaUrl }
      }
    };
  } else {
    metaBody.message = { text: content };
  }

  // Botões (quick replies) — Meta só aceita junto de mensagem de texto
  if (quickReplies && quickReplies.length > 0 && !metaBody.message.attachment) {
    metaBody.message.quick_replies = quickReplies
      .filter((qr) => qr.title && qr.title.trim())
      .map((qr) => ({
        content_type: 'text',
        title: qr.title,
        payload: qr.payload || qr.title
      }));
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

/**
 * Envia uma mensagem completa de um nó do fluxo (messageNode):
 * texto principal + botões (quick replies) + todos os anexos em sequência.
 */
export async function sendFlowMessageNode({
  conversationId,
  nodeData,
  commentId
}: {
  conversationId: string;
  nodeData: Record<string, unknown>;
  commentId?: string;
}) {
  const attachments: { id: string; type: string; value: string; label?: string; attachmentId?: string }[] =
    (nodeData.attachments as { id: string; type: string; value: string; label?: string; attachmentId?: string }[]) || [];

  const text = ((nodeData.text as string) || '').trim();
  const messageType = (nodeData.messageType as string) || 'text';
  const mediaUrl = (nodeData.mediaUrl as string) || null;

  const buttons = attachments.filter((a) => a.type === 'button');
  const quickReplies = buttons
    .filter((b) => b.label && b.label.trim())
    .map((b) => ({ title: b.label as string, payload: (b.value as string) || (b.label as string) }));

  const primaryText = text || (quickReplies.length > 0 ? 'Escolha uma opção:' : '');

  if (mediaUrl && messageType !== 'text') {
    if (primaryText) {
      await sendMessageToMeta({ conversationId, content: primaryText, messageType: 'text', commentId, quickReplies });
    }
    await sendMessageToMeta({ conversationId, content: null, mediaUrl, messageType });
  } else if (primaryText) {
    await sendMessageToMeta({ conversationId, content: primaryText, messageType: 'text', commentId, quickReplies });
  }

  for (const att of attachments) {
    if (att.type === 'button') continue;

    if (att.type === 'link' && att.value?.trim()) {
      const linkText = att.label?.trim() ? `${att.label}: ${att.value.trim()}` : att.value.trim();
      await sendMessageToMeta({ conversationId, content: linkText, messageType: 'text' });
    } else if ((att.type === 'image' || att.type === 'video' || att.type === 'file') && (att.value?.trim() || att.attachmentId)) {
      await sendMessageToMeta({
        conversationId,
        content: att.type === 'file' && att.label?.trim() ? `📎 ${att.label}` : null,
        mediaUrl: att.value?.trim() || null,
        externalAttachmentId: att.attachmentId || null,
        messageType: att.type
      });
    } else if (att.type === 'text' && att.value?.trim()) {
      await sendMessageToMeta({ conversationId, content: att.value.trim(), messageType: 'text' });
    }
  }
}
