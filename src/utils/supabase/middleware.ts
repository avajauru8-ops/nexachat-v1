import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth')
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')

  // Se não estiver logado e tentar acessar área protegida, vai para login
  if (!user && !isAuthRoute && !isApiRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    const redirectResponse = NextResponse.redirect(url)
    
    const setCookieHeaders = supabaseResponse.headers.getSetCookie ? supabaseResponse.headers.getSetCookie() : []
    setCookieHeaders.forEach((cookie) => {
      redirectResponse.headers.append('Set-Cookie', cookie)
    })
    return redirectResponse
  }

  // Se estiver logado e tentar acessar tela de auth, vai para dashboard
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    const redirectResponse = NextResponse.redirect(url)
    
    const setCookieHeaders = supabaseResponse.headers.getSetCookie ? supabaseResponse.headers.getSetCookie() : []
    setCookieHeaders.forEach((cookie) => {
      redirectResponse.headers.append('Set-Cookie', cookie)
    })
    return redirectResponse
  }

  return supabaseResponse
}
