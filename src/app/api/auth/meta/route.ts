import { NextResponse } from 'next/server';

export async function GET() {
  const appId = process.env.META_APP_ID || '1762123168122342';
  const redirectUri = process.env.NEXT_PUBLIC_BASE_URL 
    ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/meta/callback` 
    : 'https://nexachat-v1.vercel.app/api/auth/meta/callback';

  // Se o ID for do App de Login do Instagram (1762123168122342), usamos o endpoint oficial do Instagram
  let authUrl = '';
  if (appId === '1762123168122342' || appId.startsWith('176')) {
    authUrl = `https://api.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=instagram_business_basic,instagram_business_manage_messages`;
  } else {
    authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_basic,instagram_manage_messages,pages_manage_metadata,pages_read_engagement,pages_show_list&response_type=code`;
  }

  return NextResponse.redirect(authUrl);
}
