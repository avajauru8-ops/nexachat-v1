import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { conversationId, content, mediaUrl, messageType, mediaBase64, mimeType, filename } = await request.json();

    if (!conversationId || (!content && !mediaUrl && !mediaBase64)) {
      return NextResponse.json({ error: 'Faltam parâmetros' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { sendMessageToMeta } = await import('@/services/messagingService');
    const messageData = await sendMessageToMeta({
      conversationId,
      content,
      mediaUrl,
      messageType,
      mediaBase64,
      mimeType,
      filename
    });

    // Update sender_type to human_agent since this endpoint is called by the UI
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await supabaseAdmin.from('messages').update({ sender_type: 'human_agent' }).eq('id', messageData.id);

    return NextResponse.json({ success: true, message: messageData });
  } catch (error: unknown) {
    console.error('Erro no disparador de mensagens:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
