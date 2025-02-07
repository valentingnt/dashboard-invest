import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { hashPassword } from '@/utils/hash'

export async function middleware(request: NextRequest) {
  // Skip auth for login page and API routes
  if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const auth = request.cookies.get('auth')
  const hashedPassword = await hashPassword(process.env.DASHBOARD_PASSWORD || '')

  if (!auth || auth.value !== hashedPassword) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
} 