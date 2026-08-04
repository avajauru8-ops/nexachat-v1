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
  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/auth/meta/callback`;

  if (!clientId || !clientSecret) {
    console.error('META_APP_ID ou META_APP_SECRET não definidos.');
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
      const igUserId = 'ig_mock_default_id';
      await serviceSupabase.from('instagram_accounts').upsert({
        workspace_id: workspace.id,
        ig_user_id: igUserId,
        page_id: 'native_ig_login',
        access_token: 'mock_token_abc123',
        status: 'active'
      }, { onConflict: 'ig_user_id' });
      return NextResponse.redirect(new URL('/integrations?success=true', request.url));
    }

    // 1. Instagram API Direct Access Token Exchange
    const igTokenUrl = 'https://api.instagram.com/oauth/access_token';
    const form = new URLSearchParams();
    form.append('client_id', clientId);
    form.append('client_secret', clientSecret);
    form.append('grant_type', 'authorization_code');
    form.append('redirect_uri', redirectUri);
    if (code) form.append('code', code);

    const igRes = await fetch(igTokenUrl, { method: 'POST', body: form });
    const igData = await igRes.json();

    if (igData.error_type || igData.error_message || !igData.access_token) {
      console.error('Erro na troca de código com o Instagram:', igData);
      const err = igData.error_message || igData.error_type || 'Token_Exchange_Failed';
      return NextResponse.redirect(new URL(`/integrations?error=${encodeURIComponent(err)}`, request.url));
    }
    
    const shortLivedToken = igData.access_token;
    const igUserId = String(igData.user_id);
    
    if (!igUserId) {
      return NextResponse.redirect(new URL('/integrations?error=No_Instagram_Account_Linked', request.url));
    }

    // 2. Trocar por Long-Lived Token do Instagram (Dura 60 dias)
    let longLivedToken = shortLivedToken;
    try {
      const longTokenUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${clientSecret}&access_token=${shortLivedToken}`;
      const longTokenRes = await fetch(longTokenUrl);
      const longTokenData = await longTokenRes.json();
      if (longTokenData && longTokenData.access_token) {
        longLivedToken = longTokenData.access_token;
      }
    } catch (e) {
      console.warn('Aviso ao trocar token por long-lived IG:', e);
    }

    // 3. Obter detalhes do usuário via /me (padrão oauth-hub-zdg)
    let finalIgUserId = igUserId;
    let finalUsername = '';
    try {
      const profileUrl = `https://graph.instagram.com/v22.0/me?fields=id,user_id,username,name&access_token=${longLivedToken}`;
      const profileRes = await fetch(profileUrl);
      const profileData = await profileRes.json();
      if (profileData) {
        if (profileData.user_id) finalIgUserId = String(profileData.user_id);
        else if (profileData.id) finalIgUserId = String(profileData.id);
        finalUsername = profileData.username || profileData.name || `instagram_${finalIgUserId}`;
      }
    } catch (e) {
      console.warn('Não foi possível obter profile /me:', e);
    }

    // 4. Inscrever Webhooks na API de mensagens direta do Instagram via /me/subscribed_apps
    let webhookSubscribed = false;
    try {
      const subUrl = `https://graph.instagram.com/v22.0/me/subscribed_apps?subscribed_fields=messages,messaging_postbacks,messaging_optins,comments,message_reactions,follows&access_token=${longLivedToken}`;
      const subRes = await fetch(subUrl, { method: 'POST' });
      const subData = await subRes.json();
      if (subData?.success) webhookSubscribed = true;
      console.log("IG Webhook Subscription:", subData);
    } catch (e) {
      console.error("Erro ao assinar webhook no IG nativo:", e);
    }

    // 5. Salvar a conta no Supabase usando o Token Nativo do Instagram
    const { error: dbError } = await serviceSupabase.from('instagram_accounts').upsert({
      workspace_id: workspace.id,
      ig_user_id: finalIgUserId,
      page_id: 'native_ig_login', // Flag indicando que não usa Page ID do FB
      access_token: longLivedToken,
      ig_username: finalUsername,
      webhook_subscribed: webhookSubscribed,
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
