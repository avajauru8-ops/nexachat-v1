import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getMetaCredentials } from '@/utils/metaCredentials';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const errorReason = searchParams.get('error_reason') || searchParams.get('error_description');

  if (errorReason) {
    console.error('Erro retornado pela Meta no OAuth:', errorReason);
    return NextResponse.redirect(new URL(`/integrations?error=${encodeURIComponent(errorReason)}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/integrations?error=No_code_provided', request.url));
  }

  // Buscar credenciais da Meta salvas no Banco de Dados
  const { appId: clientId, appSecret: clientSecret } = await getMetaCredentials();

  // Garantir que a URL de callback seja exatamente a mesma gerada no /api/auth/meta
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
  const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${proto}://${host}`;
  const redirectUri = `${baseUrl}/api/auth/meta/callback`;

  if (!clientId || !clientSecret) {
    console.error('META_APP_ID ou META_APP_SECRET não definidos nas variáveis de ambiente.');
    return NextResponse.redirect(new URL('/integrations?error=Server_Config_Error', request.url));
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    const { data: workspace } = await serviceSupabase
      .from('workspaces')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!workspace) {
      return NextResponse.redirect(new URL('/integrations?error=No_Workspace_Found', request.url));
    }

    // -----------------------------------------
    // MODO SIMULADOR / TESTE
    // -----------------------------------------
    if (code === 'mock_success') {
      console.log('--- Conectando conta demonstrativa via Simulador NexaChat ---');
      const igUserId = 'ig_mock_' + Math.floor(Math.random() * 1000000);
      
      await serviceSupabase.from('instagram_accounts').upsert({
        workspace_id: workspace.id,
        ig_user_id: igUserId,
        page_id: 'perfil_demonstracao_ig',
        access_token: 'mock_token_abc123',
        status: 'active'
      }, { onConflict: 'ig_user_id' });

      return NextResponse.redirect(new URL('/integrations?success=true', request.url));
    }

    // -----------------------------------------
    // TROCA DE CÓDIGO META GRAPH API / INSTAGRAM
    // -----------------------------------------
    let userAccessToken = '';
    let igUserId = '';
    let username = '';

    // Tentar primeiro via Facebook OAuth Access Token Exchange (Padrão Graph API v22.0)
    const fbTokenUrl = `https://graph.facebook.com/v22.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${code}`;
    const fbRes = await fetch(fbTokenUrl);
    const fbData = await fbRes.json();

    if (fbData && fbData.access_token) {
      userAccessToken = fbData.access_token;

      // Buscar Páginas do Facebook vinculadas para encontrar a conta de Instagram Business
      try {
        const pagesUrl = `https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}&access_token=${userAccessToken}`;
        const pagesRes = await fetch(pagesUrl);
        const pagesData = await pagesRes.json();

        if (pagesData && pagesData.data && pagesData.data.length > 0) {
          for (const page of pagesData.data) {
            if (page.instagram_business_account) {
              igUserId = page.instagram_business_account.id;
              username = page.instagram_business_account.username || page.instagram_business_account.name || '';
              if (page.access_token) {
                userAccessToken = page.access_token; // Usar Page Access Token de longa duração
              }
              break;
            }
          }
        }
      } catch (e) {
        console.warn('Aviso ao buscar contas de Instagram conectadas:', e);
      }
    } else {
      // Fallback para Instagram API Direct Access Token Exchange
      const igTokenUrl = 'https://api.instagram.com/oauth/access_token';
      const form = new URLSearchParams();
      form.append('client_id', clientId);
      form.append('client_secret', clientSecret);
      form.append('grant_type', 'authorization_code');
      form.append('redirect_uri', redirectUri);
      form.append('code', code);

      const igRes = await fetch(igTokenUrl, { method: 'POST', body: form });
      const igData = await igRes.json();

      if (igData.error_type || igData.error_message) {
        console.error('Erro na troca de código com a Meta:', igData);
        const err = igData.error_message || igData.error_type || 'Token_Exchange_Failed';
        return NextResponse.redirect(new URL(`/integrations?error=${encodeURIComponent(err)}`, request.url));
      }

      userAccessToken = igData.access_token;
      igUserId = String(igData.user_id);
    }

    if (!igUserId) {
      return NextResponse.redirect(new URL('/integrations?error=No_Instagram_Account_Linked', request.url));
    }

    // Trocar por Long-Lived Token se necessário
    let longLivedToken = userAccessToken;
    try {
      const longTokenUrl = `https://graph.facebook.com/v22.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${userAccessToken}`;
      const longTokenRes = await fetch(longTokenUrl);
      const longTokenData = await longTokenRes.json();
      if (longTokenData && longTokenData.access_token) {
        longLivedToken = longTokenData.access_token;
      }
    } catch (e) {
      console.warn('Aviso ao trocar token por long-lived:', e);
    }

    // Inscrever conta nos Webhooks de mensagens
    try {
      await fetch(
        `https://graph.facebook.com/v22.0/${igUserId}/subscribed_apps?subscribed_fields=messages,comments,mentions&access_token=${longLivedToken}`,
        { method: 'POST' }
      );
    } catch (e) {
      console.warn('Aviso ao inscrever webhook:', e);
    }

    // Salvar no Supabase
    const { error: upsertErr } = await serviceSupabase
      .from('instagram_accounts')
      .upsert({
        workspace_id: workspace.id,
        ig_user_id: igUserId,
        page_id: username || igUserId,
        access_token: longLivedToken,
        status: 'active'
      }, { onConflict: 'ig_user_id' });

    if (upsertErr) {
      console.error('Erro ao salvar no banco:', upsertErr);
      return NextResponse.redirect(new URL('/integrations?error=Save_Account_Failed', request.url));
    }

    return NextResponse.redirect(new URL('/integrations?success=true', request.url));
  } catch (error) {
    console.error('Erro no callback Meta:', error);
    return NextResponse.redirect(new URL('/integrations?error=Internal_Error', request.url));
  }
}
