import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getMetaCredentials } from '@/utils/metaCredentials';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let code = searchParams.get('code');
  if (code && code.endsWith('#_')) {
    code = code.slice(0, -2);
  }
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

  const redirectUri = 'https://nexachat-v1.vercel.app/api/auth/meta/callback';

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
    const username = '';


      // Instagram API Direct Access Token Exchange
    const igTokenUrl = 'https://api.instagram.com/oauth/access_token';
    const form = new URLSearchParams();
    form.append('client_id', clientId);
    form.append('client_secret', clientSecret);
    form.append('grant_type', 'authorization_code');
    form.append('redirect_uri', redirectUri);
    if (code) form.append('code', code);

    console.log('--- INSTAGRAM TOKEN EXCHANGE ---');
    console.log('Sending to:', igTokenUrl);
    console.log('client_id:', clientId);
    console.log('redirect_uri:', redirectUri);
    console.log('code:', code);
    console.log('code length:', code ? code.length : 0);
    console.log('--------------------------------');

    const igRes = await fetch(igTokenUrl, { method: 'POST', body: form });
    const igData = await igRes.json();

    if (igData.error_type || igData.error_message || !igData.access_token) {
      console.error('Erro na troca de código com a Meta:', igData);
      const err = igData.error_message || igData.error_type || 'Token_Exchange_Failed';
      return NextResponse.redirect(new URL(`/integrations?error=${encodeURIComponent(err)}`, request.url));
    }
      userAccessToken = igData.access_token;
      igUserId = String(igData.user_id);
    

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
      const isFbToken = longLivedToken.startsWith('EAA');
      if (isFbToken) {
        // Facebook Page token -> subscribe to graph.facebook.com/{page_id}
        // NOTE: For Meta Graph API, the Page ID is required to subscribe to webhooks, but we don't have the exact Page ID in scope easily if we overrode it.
        // Actually, earlier in the code we had the page access token.
        // Let's use the /me/subscribed_apps endpoint which uses the Page Token implicitly!
        const subRes = await fetch(
          `https://graph.facebook.com/v22.0/me/subscribed_apps?subscribed_fields=messages,messaging_postbacks,messaging_optins&access_token=${longLivedToken}`,
          { method: 'POST' }
        );
        const subData = await subRes.json();
        console.log("FB Webhook Subscription:", subData);
      } else {
        // Instagram Direct token -> subscribe to graph.instagram.com/{ig_user_id}
        const subRes = await fetch(
          `https://graph.instagram.com/v22.0/${igUserId}/subscribed_apps?subscribed_fields=messages,comments,mentions&access_token=${longLivedToken}`,
          { method: 'POST' }
        );
        const subData = await subRes.json();
        console.log("IG Webhook Subscription:", subData);
      }
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
