import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { conversationId, content, mediaUrl, messageType } = await request.json();

    if (!conversationId || (!content && !mediaUrl)) {
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
      return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
    }

    const rawContact = Array.isArray(conversation.contacts) ? conversation.contacts[0] : conversation.contacts;
    const contact = rawContact as unknown as Record<string, unknown>;
    
    const rawAccount = Array.isArray(contact?.instagram_accounts) ? contact?.instagram_accounts[0] : contact?.instagram_accounts;
    const igAccount = rawAccount as unknown as Record<string, unknown>;

    const igScopedId = contact?.ig_scoped_id;
    const igUserId = igAccount?.ig_user_id;
    const pageAccessToken = igAccount?.access_token;

    if (!igScopedId || !igUserId || !pageAccessToken) {
      return NextResponse.json({ error: 'Dados da conta/contato incompletos para disparo' }, { status: 400 });
    }

    // Chama a API da Meta (Nova API Instagram Login: usa /v22.0/me/messages)
    const metaUrl = `https://graph.instagram.com/v22.0/me/messages`;
    
    const metaBody: Record<string, unknown> = {
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
      console.error('Erro na Meta Send API:', metaData.error);
      return NextResponse.json({ error: metaData.error.message || 'Erro ao enviar pela Meta', details: metaData.error }, { status: 500 });
    }

    // Se a mensagem enviou com sucesso pela Meta, salvamos no nosso banco
    // Usamos o Admin Client porque o banco de dados tem RLS ativado que bloqueia INSERTs do usuário comum
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: messageData, error: msgError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'human_agent',
        message_type: mediaUrl ? (messageType === 'video' ? 'video' : 'image') : 'text',
        content: content || null,
        media_url: mediaUrl || null
      })
      .select()
      .single();

    if (msgError) {
      console.error('Erro ao salvar no Supabase:', msgError);
      return NextResponse.json({ error: 'Erro ao salvar a mensagem no banco' }, { status: 500 });
    }

    // Atualiza a conversation para last_interaction_at
    await supabaseAdmin.from('conversations').update({ last_interaction_at: new Date().toISOString() }).eq('id', conversationId);

    return NextResponse.json({ success: true, message: messageData });
  } catch (error: unknown) {
    console.error('Erro no disparador de mensagens:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
