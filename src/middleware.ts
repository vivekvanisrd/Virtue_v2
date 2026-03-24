import { NextResponse, type NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. Get Session Cookie
  const session = request.cookies.get('v-session')?.value;
  
  // 2. Decrypt/Verify (Directly in middleware via jose)
  const user = session ? await decrypt(session) : null;

  // 3. Protection Logic
  
  // Redirect to login if accessing protected route without session
  const protectedRoutes = ['/dashboard', '/developer'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute && !user) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Redirect to dashboard if logged in and trying to access login
  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
