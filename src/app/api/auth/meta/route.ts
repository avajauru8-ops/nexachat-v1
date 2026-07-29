import { NextResponse } from 'next/server'

export async function GET() {
  const appId = process.env.META_APP_ID || 'dummy_app_id'
  const redirectUri = process.env.NEXT_PUBLIC_BASE_URL 
    ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/meta/callback` 
    : 'http://localhost:3000/api/auth/meta/callback'

  // Documentação oficial do Facebook Login for Business
  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_basic,instagram_manage_messages,pages_manage_metadata,pages_read_engagement,pages_show_list&response_type=code`

  return NextResponse.redirect(authUrl)
}
