import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface WindowCheckResult {
  canSend: boolean;
  reason?: string;
  windowExpiresAt?: string | null;
}

/**
 * Valida se uma mensagem pode ser enviada respeitando a Janela de 24 Horas da Meta Graph API.
 * A janela de 24h é renovada sempre que o contato envia uma mensagem inbound.
 */
export async function canSendMessage(conversationId: string): Promise<WindowCheckResult> {
  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('id, last_interaction_at, window_expires_at, status')
    .eq('id', conversationId)
    .single();

  if (error || !conversation) {
    return { canSend: false, reason: 'Conversa não encontrada' };
  }

  // Se a conversa estiver pausada para atendimento humano ou fechada
  if (conversation.status === 'closed') {
    return { canSend: false, reason: 'Conversa está encerrada' };
  }

  const now = new Date();
  
  // Se window_expires_at não estiver definido, calcula a partir do last_interaction_at + 24 horas
  let expiresAt: Date;
  if (conversation.window_expires_at) {
    expiresAt = new Date(conversation.window_expires_at);
  } else if (conversation.last_interaction_at) {
    expiresAt = new Date(new Date(conversation.last_interaction_at).getTime() + 24 * 60 * 60 * 1000);
  } else {
    // Caso padrão: permite se criado recentemente
    expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }

  if (now > expiresAt) {
    return {
      canSend: false,
      reason: 'Janela de 24 horas da Meta expirou. O contato precisa enviar uma nova mensagem.',
      windowExpiresAt: expiresAt.toISOString()
    };
  }

  return {
    canSend: true,
    windowExpiresAt: expiresAt.toISOString()
  };
}

/**
 * Atualiza o timer da janela de 24h quando o contato envia uma mensagem inbound.
 */
export async function refresh24hWindow(conversationId: string): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  await supabase
    .from('conversations')
    .update({
      last_interaction_at: now.toISOString(),
      window_expires_at: expiresAt
    })
    .eq('id', conversationId);
}
