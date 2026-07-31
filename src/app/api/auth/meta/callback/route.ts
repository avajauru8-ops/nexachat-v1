import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getMetaCredentials } from '@/utils/metaCredentials';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    if (code === 'mock_success') {
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

    // 1. Trocar o código de autorização pelo token de acesso curto do usuário
    const fbTokenUrl = `https://graph.facebook.com/v22.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${code}`;
    
    console.log('--- FB TOKEN EXCHANGE ---');
    const fbRes = await fetch(fbTokenUrl);
    const fbData = await fbRes.json();
    
    if (fbData.error) {
      console.error('Erro na troca do código pelo token FB:', fbData.error);
      return NextResponse.redirect(new URL(`/integrations?error=${encodeURIComponent(fbData.error.message || 'FB_Token_Error')}`, request.url));
    }
    
    const userAccessToken = fbData.access_token;
    if (!userAccessToken) {
      return NextResponse.redirect(new URL('/integrations?error=No_Access_Token_Returned', request.url));
    }

    // 2. Obter token de longo prazo (long-lived)
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

    // 3. Buscar as Páginas do Facebook vinculadas ao usuário
    const accountsUrl = `https://graph.facebook.com/v22.0/me/accounts?access_token=${longLivedToken}`;
    const accountsRes = await fetch(accountsUrl);
    const accountsData = await accountsRes.json();

    if (accountsData.error || !accountsData.data || accountsData.data.length === 0) {
      console.error('Nenhuma Página do Facebook encontrada ou erro:', accountsData);
      return NextResponse.redirect(new URL('/integrations?error=No_Facebook_Pages_Found', request.url));
    }

    let igUserId = '';
    let linkedPageId = '';
    let pageAccessToken = '';
    let igUsername = '';

    // Procurar por uma página que tenha uma conta do Instagram Business vinculada
    for (const page of accountsData.data) {
      const pageId = page.id;
      const pageToken = page.access_token;

      const pageDetailsUrl = `https://graph.facebook.com/v22.0/${pageId}?fields=instagram_business_account&access_token=${pageToken}`;
      const pageDetailsRes = await fetch(pageDetailsUrl);
      const pageDetailsData = await pageDetailsRes.json();

      if (pageDetailsData.instagram_business_account && pageDetailsData.instagram_business_account.id) {
        igUserId = pageDetailsData.instagram_business_account.id;
        linkedPageId = pageId;
        pageAccessToken = pageToken;

        // Tentar obter o username do Instagram para exibir no painel
        try {
          const igDetailsRes = await fetch(`https://graph.facebook.com/v22.0/${igUserId}?fields=username&access_token=${pageToken}`);
          const igDetailsData = await igDetailsRes.json();
          if (igDetailsData.username) {
            igUsername = igDetailsData.username;
          }
        } catch (e) {
          console.warn('Não foi possível obter o username do IG:', e);
        }

        break;
      }
    }

    if (!igUserId || !pageAccessToken) {
      return NextResponse.redirect(new URL('/integrations?error=No_Instagram_Business_Account_Linked_To_Page', request.url));
    }

    // 4. Inscrever o Webhook no aplicativo para a Página vinculada
    try {
      const subRes = await fetch(
        `https://graph.facebook.com/v22.0/${linkedPageId}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,messaging_optins&access_token=${pageAccessToken}`,
        { method: 'POST' }
      );
      const subData = await subRes.json();
      console.log("FB Webhook Subscription:", subData);
    } catch (e) {
      console.error("Erro ao assinar webhook:", e);
    }

    // 5. Salvar as informações no banco de dados (usando o pageAccessToken que é necessário para as requisições Graph)
    const { error: dbError } = await serviceSupabase.from('instagram_accounts').upsert({
      workspace_id: workspace.id,
      ig_user_id: igUserId,
      page_id: linkedPageId,
      access_token: pageAccessToken, // É importante usar o token da Página para mandar mensagens!
      username: igUsername || igUserId,
      status: 'active'
    }, { onConflict: 'ig_user_id' });

    if (dbError) {
      console.error('Erro ao salvar no Supabase:', dbError);
      return NextResponse.redirect(new URL('/integrations?error=Database_Save_Error', request.url));
    }

    return NextResponse.redirect(new URL('/integrations?success=true', request.url));
  } catch (error) {
    console.error('Erro no callback Meta OAuth:', error);
    return NextResponse.redirect(new URL('/integrations?error=Internal_Server_Error', request.url));
  }
}
