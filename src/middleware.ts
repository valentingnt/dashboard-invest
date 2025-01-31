import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { hashPassword } from './utils/hash'

const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD

export async function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('auth')
  
  if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  if (!authCookie?.value || !DASHBOARD_PASSWORD) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    // Verify the hash from cookie matches the current password
    const currentHash = await hashPassword(DASHBOARD_PASSWORD)
    if (authCookie.value !== currentHash) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  } catch {
    // If verification fails, redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const response = NextResponse.next()
  
  if (authCookie) {
    response.cookies.set({
      name: 'auth',
      value: authCookie.value,
      path: '/',
      secure: true,
      sameSite: 'strict',
    })
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
} 