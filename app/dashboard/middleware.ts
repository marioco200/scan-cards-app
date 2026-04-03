import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')

  if (isDashboard) {
    const auth = request.headers.get('authorization')

    const username = 'admin'
    const password = '1234'

    if (!auth) {
      return new Response('Auth required', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Secure Area"'
        }
      })
    }

    const base64 = auth.split(' ')[1]
    const [user, pass] = atob(base64).split(':')

    if (user !== username || pass !== password) {
      return new Response('Access denied', { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*']
}