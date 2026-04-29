import { type NextRequest, NextResponse } from 'next/server'

const SESSION_COOKIE = 'powersis_session'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = request.cookies.get(SESSION_COOKIE)?.value

  const isAuth = session === 'authenticated'
  const isLoginPage = pathname.startsWith('/auth/login')
  const isPublic =
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.svg') ||
    pathname === '/'

  // Redirigir al login si no autenticado
  if (!isAuth && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Redirigir al dashboard si ya autenticado y va al login
  if (isAuth && isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
