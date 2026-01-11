import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 检查是否为受保护的路由
  const isProtected =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/lesson') ||
    pathname.startsWith('/history') ||
    pathname.startsWith('/flashcards') ||
    pathname.startsWith('/conversation') ||
    pathname.startsWith('/analysis')

  // 创建响应对象
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 创建 Supabase 客户端
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 检查 session
  const { data: { session } } = await supabase.auth.getSession()

  // 如果访问受保护路由但没有 session，重定向到登录页
  if (isProtected && !session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 如果已登录但访问登录/注册页，重定向到 dashboard
  if ((pathname === '/login' || pathname === '/register') && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/lesson/:path*',
    '/history/:path*',
    '/flashcards/:path*',
    '/conversation/:path*',
    '/analysis/:path*',
    '/login',
    '/register'
  ]
}
