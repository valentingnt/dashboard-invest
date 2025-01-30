import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('auth')
  
  // Allow access to login page and api routes
  if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // Redirect to login if not authenticated
  if (!authCookie?.value) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const response = NextResponse.next()
  
  // Ensure cookie is properly set with correct attributes
  if (authCookie) {
    response.cookies.set({
      name: 'auth',
      value: authCookie.value,
      path: '/',
      secure: true,
      sameSite: 'strict',
      // Don't set expires to ensure it's a session cookie
    })
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
} 