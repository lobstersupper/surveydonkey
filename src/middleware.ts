import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Generate session cookie if not present for anonymous respondent tracking
  const response = NextResponse.next();
  if (!request.cookies.get('sd_session')) {
    const sessionToken = `sd_sess_${Math.random().toString(36).substring(2)}${Date.now()}`;
    response.cookies.set('sd_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
