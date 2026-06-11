import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/login', '/api/auth/login'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cho phép các đường dẫn công khai
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Cho phép static files và API nội bộ
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  // Kiểm tra session cookie
  const sessionCookie = request.cookies.get('inventory_session');

  if (!sessionCookie?.value) {
    // Chưa đăng nhập → redirect về trang login
    // Nếu gọi API → trả về 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Kiểm tra session hết hạn
  try {
    const session = JSON.parse(sessionCookie.value);
    if (Date.now() > session.expiresAt) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Session expired' }, { status: 401 });
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('expired', '1');
      return NextResponse.redirect(loginUrl);
    }
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
