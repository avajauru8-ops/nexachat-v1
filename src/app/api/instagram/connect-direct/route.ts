import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { resubscribeInstagramWebhooks } from '@/utils/instagramWebhook';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ig_user_id, access_token, username: customUsername } = body;

    if (!ig_user_id || !access_token) {
      return NextResponse.json(
        { error: 'ID do Usuário Instagram e Access Token são obrigatórios.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado. Faça login novamente.' }, { status: 401 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Buscar workspace do usuário logado
    const { data: workspace } = await serviceSupabase
      .from('workspaces')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado.' }, { status: 404 });
    }

    // 1. Validar e buscar informações reais do perfil na Meta Graph API
    let fetchedUsername = customUsername || '';
    let profilePicUrl = '';

    try {
      // Tentar via Graph API Facebook/Instagram v22.0
      const graphRes = await fetch(
        `https://graph.facebook.com/v22.0/${ig_user_id}?fields=id,username,name,profile_picture_url&access_token=${access_token}`
      );
      const graphData = await graphRes.json();

      if (graphData && graphData.username) {
        fetchedUsername = graphData.username;
        profilePicUrl = graphData.profile_picture_url || '';
      } else {
        // Tentar via Graph API Instagram Direct Token
        const igRes = await fetch(
          `https://graph.instagram.com/v22.0/me?fields=id,username,profile_picture_url&access_token=${access_token}`
        );
        const igData = await igRes.json();
        if (igData && igData.username) {
          fetchedUsername = igData.username;
          profilePicUrl = igData.profile_picture_url || '';
        }
      }
    } catch (e) {
      console.warn('Aviso ao consultar Graph API da Meta:', e);
    }

    const finalUsername = fetchedUsername || customUsername || ig_user_id;

    // 2. Tentar inscrever a conta nos Webhooks de mensagens da Meta automaticamente
    try {
      const subResult = await resubscribeInstagramWebhooks({
        id: '',
        ig_user_id: String(ig_user_id).trim(),
        page_id: null,
        access_token: access_token.trim()
      });
      console.log('Webhook subscription (connect-direct):', subResult);
    } catch (e) {
      console.warn('Aviso ao registrar Webhook da Meta:', e);
    }

    // 3. Persistir dados reais da conta no banco de dados Supabase
    const { data: savedAccount, error: upsertErr } = await serviceSupabase
      .from('instagram_accounts')
      .upsert({
        workspace_id: workspace.id,
        ig_user_id: String(ig_user_id).trim(),
        page_id: finalUsername,
        access_token: access_token.trim(),
        status: 'active'
      }, { onConflict: 'ig_user_id' })
      .select('*')
      .single();

    if (upsertErr) {
      console.error('Erro ao salvar conta Instagram no banco:', upsertErr);
      return NextResponse.json(
        { error: 'Falha ao salvar conta no banco de dados: ' + upsertErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      account: {
        id: savedAccount.id,
        ig_user_id: savedAccount.ig_user_id,
        username: finalUsername,
        profile_picture_url: profilePicUrl,
        status: savedAccount.status
      }
    });
  } catch (error: unknown) {
    console.error('Erro ao conectar conta Instagram:', error);
    return NextResponse.json(
      { error: 'Erro interno ao conectar Instagram: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
