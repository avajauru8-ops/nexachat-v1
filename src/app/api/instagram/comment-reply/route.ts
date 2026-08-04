import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * POST /api/instagram/comment-reply
 * Responde PUBLICAMENTE a um comentário do Instagram (reply no próprio post),
 * usando o commentId da última mensagem de comentário da conversa.
 * Body: { conversationId, content }
 */
export async function POST(request: Request) {
  try {
    const { conversationId, content } = await request.json();

    if (!conversationId || !content?.trim()) {
      return NextResponse.json({ error: 'Faltam parâmetros' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Carregar a conversa + conta para obter o access_token
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .select(`
        id,
        workspace_id,
        contacts (
          ig_scoped_id,
          instagram_accounts ( access_token, ig_user_id, page_id )
        )
      `)
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
    }

    const rawContact = Array.isArray(conversation.contacts) ? conversation.contacts[0] : conversation.contacts;
    const rawAccount = Array.isArray(rawContact?.instagram_accounts) ? rawContact?.instagram_accounts[0] : rawContact?.instagram_accounts;
    const accessToken = rawAccount?.access_token;

    if (!accessToken) {
      return NextResponse.json({ error: 'Conta do Instagram não conectada' }, { status: 404 });
    }

    // 2. Localizar o commentId (meta_message_id) da última mensagem de comentário
    const { data: commentMsg } = await supabaseAdmin
      .from('messages')
      .select('meta_message_id')
      .eq('conversation_id', conversationId)
      .eq('message_type', 'comment')
      .not('meta_message_id', 'is', null)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    const commentId = commentMsg?.meta_message_id;

    if (!commentId) {
      return NextResponse.json({ error: 'Comentário original não encontrado nesta conversa' }, { status: 404 });
    }

    // 3. Responder publicamente via Meta Graph API
    const url = `https://graph.facebook.com/v22.0/${commentId}/replies`;
    const metaRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: content.trim() })
    });

    const metaData = await metaRes.json();

    if (metaData.error) {
      throw new Error(metaData.error.message || 'Erro ao responder comentário na Meta');
    }

    // 4. Salvar a resposta como mensagem outbound no banco
    const { data: messageData, error: msgError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'human_agent',
        message_type: 'comment',
        direction: 'outbound',
        content: content.trim(),
        meta_message_id: metaData.id || `reply_${Date.now()}`
      })
      .select()
      .single();

    if (msgError) {
      throw new Error('Erro ao salvar a resposta no banco');
    }

    return NextResponse.json({ success: true, message: messageData });
  } catch (error: unknown) {
    console.error('Erro ao responder comentário:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
