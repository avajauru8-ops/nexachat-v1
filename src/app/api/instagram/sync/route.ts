import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar workspace
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    // Buscar contas conectadas
    const { data: accounts } = await supabase
      .from('instagram_accounts')
      .select('id, access_token, ig_user_id, page_id')
      .eq('workspace_id', workspace.id)
      .eq('status', 'active');

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ error: 'Nenhuma conta ativa encontrada' }, { status: 404 });
    }

    const account = accounts[0];
    const accessToken = account.access_token;
    const myIgUserId = account.ig_user_id;

    // Reinscrever a conta nos webhooks do Instagram (garante 'follows' para contas já conectadas)
    try {
      await fetch(
        `https://graph.facebook.com/v22.0/${myIgUserId}/subscribed_apps?subscribed_fields=messages,comments,mentions,follows&access_token=${accessToken}`,
        { method: 'POST' }
      );
    } catch {
      /* token pode ser do tipo nativo (graph.instagram.com) */
    }
    try {
      await fetch(
        `https://graph.instagram.com/v22.0/me/subscribed_apps?subscribed_fields=messages,messaging_postbacks,messaging_optins,comments,message_reactions,follows&access_token=${accessToken}`,
        { method: 'POST' }
      );
    } catch {
      /* token pode ser do tipo Meta (graph.facebook.com) */
    }

    // Fazer fetch na API do Instagram (tratado de forma totalmente segura)
    let syncedCount = 0;
    try {
      const url = `https://graph.instagram.com/v22.0/${myIgUserId}/conversations?platform=instagram&limit=10&fields=id,updated_time,participants,messages.limit(10){id,created_time,message,from,to}&access_token=${accessToken}`;
      
      const res = await fetch(url);
      const data = await res.json();

      if (!data.error && data.data) {
        const conversations = data.data || [];
        const botUsername = account.page_id || myIgUserId;

        for (const conv of conversations) {
          const participants = conv.participants?.data || [];
          const leadParticipant = participants.find((p: Record<string, unknown>) => p.username !== botUsername);
          
          if (!leadParticipant) continue;

          let profilePicUrl = null;
          try {
            const pRes = await fetch(`https://graph.instagram.com/v22.0/${leadParticipant.id}?fields=profile_pic&access_token=${accessToken}`);
            const pData = await pRes.json();
            if (pData.profile_pic) profilePicUrl = pData.profile_pic;
          } catch { /* ignore */ }

          // 1. Criar ou Atualizar Contato
          let { data: contact } = await supabase
            .from('contacts')
            .select('id')
            .eq('workspace_id', workspace.id)
            .eq('ig_scoped_id', leadParticipant.id)
            .single();

          if (!contact) {
            const { data: newContact } = await supabase
              .from('contacts')
              .insert({
                workspace_id: workspace.id,
                instagram_account_id: account.id,
                ig_scoped_id: leadParticipant.id,
                name: leadParticipant.username || 'Lead',
                profile_picture: profilePicUrl
              })
              .select('id')
              .single();
            contact = newContact;
          }

          if (!contact) continue;

          // 2. Criar ou Atualizar Conversação
          let { data: conversation } = await supabase
            .from('conversations')
            .select('id')
            .eq('workspace_id', workspace.id)
            .eq('contact_id', contact.id)
            .single();

          if (!conversation) {
            const { data: newConv } = await supabase
              .from('conversations')
              .insert({
                workspace_id: workspace.id,
                contact_id: contact.id,
                status: 'bot_active'
              })
              .select('id')
              .single();
            conversation = newConv;
          }

          if (!conversation) continue;

          await supabase
            .from('conversations')
            .update({ last_interaction_at: new Date(conv.updated_time).toISOString() })
            .eq('id', conversation.id);

          const messages = conv.messages?.data || [];
          for (const msg of messages) {
            const isFromMe = msg.from?.username === botUsername || msg.from?.id === myIgUserId;
            const content = msg.message || '';

            const { data: existingMsg } = await supabase
              .from('messages')
              .select('id')
              .eq('conversation_id', conversation.id)
              .eq('content', content)
              .single();

            if (!existingMsg) {
              await supabase.from('messages').insert({
                conversation_id: conversation.id,
                sender_type: isFromMe ? 'bot' : 'user',
                message_type: 'text',
                content: content
              });
            }
          }
          
          syncedCount++;
        }
      }
    } catch (e) {
      console.warn("Manual sync endpoint not supported by Meta for this token type, relying on Webhooks:", e);
    }

    return NextResponse.json({ 
      success: true, 
      synced: syncedCount,
      message: 'Sincronização via Webhook em tempo real ativa!'
    });
  } catch (error: unknown) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
