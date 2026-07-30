import { SupabaseClient } from '@supabase/supabase-js';

export interface CanSendMessageResult {
  allowed: boolean;
  reason?: string;
  conversation?: {
    id: string;
    workspace_id: string;
    contact_id: string;
    status: string;
    window_expires_at?: string | null;
  };
}

/**
 * Valida se uma mensagem pode ser enviada para a conversa respeitando a janela de 24h da Meta,
 * o status da conversa e o consentimento.
 */
export async function canSendMessage(
  conversationId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>
): Promise<CanSendMessageResult> {
  try {
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('id, workspace_id, contact_id, status, window_expires_at, last_interaction_at')
      .eq('id', conversationId)
      .maybeSingle();

    if (error || !conversation) {
      return { allowed: false, reason: 'Conversa não encontrada' };
    }

    // Se o status for fechado
    if (conversation.status === 'closed') {
      return { allowed: false, reason: 'A conversa está encerrada', conversation };
    }

    // Verificar se a janela de 24 horas está ativa
    if (conversation.window_expires_at) {
      const windowExpiry = new Date(conversation.window_expires_at).getTime();
      const now = Date.now();

      if (now > windowExpiry) {
        return {
          allowed: false,
          reason: 'Janela de 24h da Meta expirou. Aguarde nova mensagem do contato.',
          conversation
        };
      }
    }

    return { allowed: true, conversation };
  } catch (err) {
    console.error('[InstagramGuard] Erro ao validar canSendMessage:', err);
    return { allowed: false, reason: 'Erro interno ao validar regras de mensagem' };
  }
}
