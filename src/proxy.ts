import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Edge-compatible auth instance — no Prisma, no bcrypt, no Node.js crypto
const { auth } = NextAuth(authConfig)

const PUBLIC_PATHS = [
  '/',
  '/docs',
  '/auth/signin',
  '/auth/signup',
  '/auth/verify-email',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/api/auth',
  '/api/play',
  '/api/device/me',
  '/api/health',
]

export default auth((req: NextRequest & { auth: { user?: unknown } | null }) => {
  const { pathname } = req.nextUrl

  // Allow public paths (exact match, query string variant, or sub-path)
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + '?') || pathname.startsWith(path + '/'))) {
    return NextResponse.next()
  }

  // Allow Next.js internals and static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Protect dashboard and private API routes
  const session = req.auth
  if (!session?.user) {
    const signInUrl = new URL('/auth/signin', req.url)
    signInUrl.searchParams.set('callbackUrl', req.url)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
