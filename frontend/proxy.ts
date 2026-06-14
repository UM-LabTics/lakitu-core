import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/signup']
const ADMIN_PREFIX = '/stats'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const sessionToken = request.cookies.get('session_token')
  const isAdminCookie = request.cookies.get('is_admin')

  const isAuthenticated = !!sessionToken?.value
  const isAdmin = isAdminCookie?.value === '1'

  // No autenticados solo pueden ir a /login y /signup
  if (!isAuthenticated) {
    if (!PUBLIC_ROUTES.includes(pathname) || pathname === '/') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  // Autenticados no pueden ir a /login ni /signup
  if (PUBLIC_ROUTES.includes(pathname) || pathname === '/') {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  // Para no admins las /stats no existen
  if (pathname.startsWith(ADMIN_PREFIX) && !isAdmin) {
    return NextResponse.rewrite(new URL('/_not-found', request.url))
  }

  if (pathname === '/stats' && isAdmin) {
    return NextResponse.redirect(new URL('/stats/dailyOccupancy', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|avif|bmp|tiff)$).*)',
  ],
}