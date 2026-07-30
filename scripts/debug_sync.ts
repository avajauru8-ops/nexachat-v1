import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function testSync() {
  console.log("Iniciando sync local...");
  
  // Buscar contas conectadas
  const { data: accounts } = await supabase
    .from('instagram_accounts')
    .select('id, workspace_id, access_token, ig_user_id')
    .eq('status', 'active');

  if (!accounts || accounts.length === 0) {
    console.log("Nenhuma conta ativa");
    return;
  }

  const account = accounts[0];
  const accessToken = account.access_token;
  const myIgUserId = account.ig_user_id;
  const workspaceId = account.workspace_id;

  const url = `https://graph.instagram.com/v20.0/me/conversations?platform=instagram&fields=id,updated_time,participants,messages.limit(10){id,created_time,message,from,to}&access_token=${accessToken}`;
  
  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    console.error("Erro Meta API:", data.error);
    return;
  }

  const conversations = data.data || [];
  let syncedCount = 0;

  const meRes = await fetch(`https://graph.instagram.com/v20.0/me?fields=username&access_token=${accessToken}`);
  const meData = await meRes.json();
  const botUsername = meData.username;

  for (const conv of conversations) {
    const participants = conv.participants?.data || [];
    const leadParticipant = participants.find((p: any) => p.username !== botUsername);
    
    if (!leadParticipant) {
      console.log(`Sem lead em conv ${conv.id}`);
      continue;
    }

    let profilePicUrl = null;
    try {
      const pRes = await fetch(`https://graph.instagram.com/v20.0/${leadParticipant.id}?fields=profile_pic&access_token=${accessToken}`);
      const pData = await pRes.json();
      if (pData.profile_pic) profilePicUrl = pData.profile_pic;
    } catch (e) {}

    console.log(`Processando Lead: ${leadParticipant.username}`);

    let { data: contact, error: errContact1 } = await supabase
      .from('contacts')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('ig_scoped_id', leadParticipant.id)
      .single();

    if (!contact) {
      console.log(`Criando contato para ${leadParticipant.username}`);
      const { data: newContact, error } = await supabase
        .from('contacts')
        .insert({
          workspace_id: workspaceId,
          instagram_account_id: account.id,
          ig_scoped_id: leadParticipant.id,
          name: leadParticipant.username || 'Lead',
          profile_picture: profilePicUrl
        })
        .select('id')
        .single();
      if (error) console.error("Erro contato:", error);
      contact = newContact;
    }

    if (!contact) continue;

    let { data: conversation, error: errConv1 } = await supabase
      .from('conversations')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('contact_id', contact.id)
      .single();

    if (!conversation) {
      console.log(`Criando conversa para ${leadParticipant.username}`);
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          workspace_id: workspaceId,
          contact_id: contact.id,
          status: 'bot_active'
        })
        .select('id')
        .single();
      if (error) console.error("Erro conversação:", error);
      conversation = newConv;
    }

    if (!conversation) continue;

    console.log(`Atualizando conversa ${conversation.id}`);

    await supabase
      .from('conversations')
      .update({ last_interaction_at: new Date(conv.updated_time).toISOString() })
      .eq('id', conversation.id);

    const messages = conv.messages?.data || [];
    console.log(`Inserindo ${messages.length} mensagens...`);
    
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
        const { error: msgErr } = await supabase.from('messages').insert({
          conversation_id: conversation.id,
          sender_type: isFromMe ? 'bot' : 'user',
          message_type: 'text',
          content: content,
          timestamp: new Date(msg.created_time).toISOString()
        });
        if (msgErr) console.error("Erro mensagem:", msgErr);
      }
    }
    syncedCount++;
  }

  console.log(`Sincronizados: ${syncedCount}`);
}

testSync().catch(console.error);
