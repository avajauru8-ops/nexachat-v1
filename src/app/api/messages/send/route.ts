import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const { conversationId, content } = await request.json();

    if (!conversationId || !content) {
      return NextResponse.json({ error: 'Faltam parâmetros' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar a conversation, o contato e a conta do instagram vinculada
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(`
        id,
        instagram_account_id,
        contact_id,
        contacts (
          ig_scoped_id
        ),
        instagram_accounts (
          ig_user_id,
          access_token
        )
      `)
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
    }

    const contact = conversation.contacts as unknown as { ig_scoped_id: string };
    const igAccount = conversation.instagram_accounts as unknown as { ig_user_id: string, access_token: string };

    const igScopedId = contact?.ig_scoped_id;
    const igUserId = igAccount?.ig_user_id;
    const pageAccessToken = igAccount?.access_token;

    if (!igScopedId || !igUserId || !pageAccessToken) {
      return NextResponse.json({ error: 'Dados da conta/contato incompletos para disparo' }, { status: 400 });
    }

    // Chama a API da Meta
    const metaUrl = `https://graph.facebook.com/v19.0/${igUserId}/messages`;
    
    const metaBody = {
      recipient: { id: igScopedId },
      message: { text: content }
    };

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
      console.error('Erro na Meta Send API:', metaData.error);
      return NextResponse.json({ error: 'Erro ao enviar pela Meta', details: metaData.error }, { status: 500 });
    }

    // Se a mensagem enviou com sucesso pela Meta, salvamos no nosso banco
    const { data: messageData, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'human_agent',
        message_type: 'text',
        content: content,
        status: 'sent'
      })
      .select()
      .single();

    if (msgError) {
      return NextResponse.json({ error: 'Erro ao salvar a mensagem no banco' }, { status: 500 });
    }

    // Atualiza a conversation para last_interaction_at
    await supabase.from('conversations').update({ last_interaction_at: new Date().toISOString() }).eq('id', conversationId);

    return NextResponse.json({ success: true, message: messageData });
  } catch (error: unknown) {
    console.error('Erro no disparador de mensagens:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
