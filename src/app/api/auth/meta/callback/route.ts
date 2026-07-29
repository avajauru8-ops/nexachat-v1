import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  
  if (!code) {
    return NextResponse.redirect(new URL('/integrations?error=No_code_provided', request.url))
  }

  const clientId = process.env.META_APP_ID;
  const clientSecret = process.env.META_APP_SECRET;
  
  // A URL de redirect precisa ser exatamente a mesma usada no authorize
  const redirectUri = process.env.NEXT_PUBLIC_BASE_URL 
    ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/meta/callback` 
    : 'http://localhost:3000/api/auth/meta/callback';

  if (!clientId || !clientSecret) {
    console.error("META_APP_ID ou META_APP_SECRET não definidos no .env.local");
    return NextResponse.redirect(new URL('/integrations?error=Server_Config_Error', request.url))
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // 1. Trocar CODE por Short-Lived User Access Token
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${clientId}&redirect_uri=${redirectUri}&client_secret=${clientSecret}&code=${code}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("Erro ao obter short-lived token:", tokenData.error);
      return NextResponse.redirect(new URL('/integrations?error=Token_Exchange_Failed', request.url))
    }

    const shortLivedToken = tokenData.access_token;

    // 2. Trocar por Long-Lived User Access Token
    const longTokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortLivedToken}`;
    const longTokenRes = await fetch(longTokenUrl);
    const longTokenData = await longTokenRes.json();
    
    const longLivedToken = longTokenData.access_token || shortLivedToken; // fallback caso dê erro no exchange

    // 3. Buscar Páginas que o usuário gerencia, pegando o instagram_business_account
    const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${longLivedToken}`;
    const pagesRes = await fetch(pagesUrl);
    const pagesData = await pagesRes.json();

    if (!pagesData.data || pagesData.data.length === 0) {
      return NextResponse.redirect(new URL('/integrations?error=No_Pages_Found', request.url))
    }

    // Procura a primeira página que tenha uma conta do Instagram conectada
    const pageWithIg = pagesData.data.find((page: any) => page.instagram_business_account?.id);

    if (!pageWithIg) {
      return NextResponse.redirect(new URL('/integrations?error=No_Instagram_Account_Linked', request.url))
    }

    const pageId = pageWithIg.id;
    const pageAccessToken = pageWithIg.access_token; // Este token já é de longa duração (Page Token)
    const igAccountId = pageWithIg.instagram_business_account.id;

    // Busca o workspace do usuário
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (workspace) {
      // Insere conta IG Oficial no banco
      await supabase.from('instagram_accounts').upsert({
        workspace_id: workspace.id,
        ig_user_id: igAccountId,
        page_id: pageId,
        access_token: pageAccessToken,
        status: 'active'
      }, { onConflict: 'ig_user_id' })
    }

    // Redireciona com sucesso
    return NextResponse.redirect(new URL('/integrations?success=true', request.url))
  } catch (error) {
    console.error('Erro no callback Meta:', error)
    return NextResponse.redirect(new URL('/integrations?error=Internal_Error', request.url))
  }
}
