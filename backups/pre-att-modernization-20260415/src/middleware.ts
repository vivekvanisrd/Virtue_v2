import { NextResponse, type NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth/session';

// 🕵️ RATE LIMIT SENTINEL (In-memory - resets on server restart)
const rateLimitMap = new Map<string, { count: number, resetAt: number }>();
const MAX_REQ_PER_MIN = 60;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // 1. Get Session Cookie
  const session = request.cookies.get('v-session')?.value;
  
  // 2. Decrypt/Verify
  const user = session ? await decrypt(session) : null;
  if (user) console.log(`🕵️ [SENTINEL] Request for '${pathname}' from user '${user.email}' (Role: ${user.role})`);

  // 🛡️ LOCK: COMPOUND RATE LIMITING (IP + User)
  const rateLimitKey = user ? `rl_u_${user.staffId}` : `rl_ip_${ip}`;
  const now = Date.now();
  const limit = rateLimitMap.get(rateLimitKey) || { count: 0, resetAt: now + 60000 };

  if (now > limit.resetAt) {
    limit.count = 1;
    limit.resetAt = now + 60000;
  } else {
    limit.count++;
  }
  rateLimitMap.set(rateLimitKey, limit);

  if (limit.count > MAX_REQ_PER_MIN) {
     return new NextResponse(
        JSON.stringify({ error: "TOO_MANY_REQUESTS", message: "Security rate limit exceeded. Please slow down.", status: 429 }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
     );
  }

  // 🛡️ LOCK: FLEXIBLE FINGERPRINTING (V7 Hardening)
  // In a real scenario, the fingerprint would be stored in the JWT payload at login.
  // We'll enforce that the UserAgent doesn't change mid-session.
  if (user && session) {
      // Note: Full fingerprinting requires the 'login' action to record the initial UA.
      // For now, we enforce institutional presence for protected routes.
  }

  // 3. Routing Protection
  const protectedRoutes = ['/dashboard', '/developer', '/registry', '/admin', '/super-admin'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // Redirect to login if accessing protected route without session
  if (isProtectedRoute && !user) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // 🛡️ LOCK: PLATFORM_ADMIN / DEVELOPER GATING
  const isAdminPath = pathname.startsWith('/developer');
  const hasAdminRole = user?.role === 'PLATFORM_ADMIN' || user?.role === 'DEVELOPER';

  if (isAdminPath && !hasAdminRole) {
    console.warn(`🛡️ [SENTINEL] BLOCKED: Path '${pathname}' requires Admin but user has role '${user?.role}'`);
    return new NextResponse(
      JSON.stringify({ error: "ACCESS_DENIED", message: "Access denied: Platform Admin or Developer privilege required.", status: 403 }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 🛡️ LOCK: INSTITUTIONAL GENESIS GATING
  if (isProtectedRoute && !hasAdminRole && !user?.schoolId) {
    console.error(`🛡️ [SENTINEL] REDIRECT: Sovereign Identity Violation for ${user?.email}. (hasAdminRole: ${hasAdminRole}, schoolId: ${user?.schoolId})`);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect to dashboard if logged in and trying to access login
  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 🏛️ SOVEREIGN BACKBONE INJECTION
  // We decrypt ONCE here and pass verified authority via headers.
  const traceId = `mid_${Math.random().toString(36).substring(7)}`;
  const requestHeaders = new Headers(request.headers);
  if (user) {
    // Determine target branch (Only Owners/Devs can switch campus)
    let activeBranchId = user.branchId || '';
    if (user.role === 'OWNER' || user.role === 'DEVELOPER') {
        const switchedBranch = request.cookies.get('v-active-branch')?.value;
        if (switchedBranch) {
            activeBranchId = switchedBranch;
        }
    }

    requestHeaders.set('x-v2-staff-id', user.staffId);
    requestHeaders.set('x-v2-role', user.role);
    requestHeaders.set('x-v2-school-id', user.schoolId || '');
    requestHeaders.set('x-v2-branch-id', activeBranchId);
    requestHeaders.set('x-v2-name', user.name || '');
    requestHeaders.set('x-v2-email', user.email || '');
    requestHeaders.set('x-v2-global-dev', user.isGlobalDev ? 'true' : 'false');
    requestHeaders.set('x-v2-trace-id', traceId);
    
    if (activeBranchId !== user.branchId) {
        console.log(`🏛️ [SENTINEL:${traceId}] Branch Context Switched to '${activeBranchId}' for ${user.role}`);
    } else {
        console.log(`🏛️ [SENTINEL:${traceId}] Injected headers for '${user.email}'`);
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
