import { NextResponse } from 'next/server';
import { getMetaCredentials } from '@/utils/metaCredentials';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'facebook';

  // Buscar credenciais diretamente do Banco de Dados Supabase (tabela system_settings)
  const { appId } = await getMetaCredentials();

  const redirectUri = 'https://nexachat-v1.vercel.app/api/auth/meta/callback';

  // Se for solicitado modo simulador/mock ou se o App ID for inválido/placeholder, usa a conexão de demonstração
  if (
    searchParams.get('mock') === 'true' ||
    !appId ||
    appId === 'seu_app_id' ||
    appId === 'dummy_app_id'
  ) {
    return NextResponse.redirect(`${redirectUri}?code=mock_success`);
  }

  let authUrl = '';

  if (type === 'instagram') {
    authUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments&response_type=code`;
  } else {
    const scopes = [
      'instagram_basic',
      'instagram_manage_messages',
      'instagram_manage_comments',
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_metadata'
    ].join(',');

    authUrl = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code`;
  }

  return NextResponse.redirect(authUrl);
}
