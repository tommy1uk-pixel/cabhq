import { NextRequest, NextResponse } from 'next/server';

function decodePayload(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(payload, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getDefaultRouteForRole(role?: string) {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/super-admin';
    case 'ADMIN':
    case 'OPERATOR':
      return '/dashboard';
    case 'DRIVER':
      return '/driver';
    default:
      return '/login';
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('cabhq_token')?.value;

  const payload = token ? decodePayload(token) : null;
  const role =
    typeof payload?.role === 'string' ? payload.role : undefined;

  const isLoggedIn = !!payload && !!role;

  if (pathname === '/') {
    if (isLoggedIn) {
      return NextResponse.redirect(
        new URL(getDefaultRouteForRole(role), req.url),
      );
    }

    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (pathname === '/login') {
    if (isLoggedIn) {
      return NextResponse.redirect(
        new URL(getDefaultRouteForRole(role), req.url),
      );
    }

    return NextResponse.next();
  }

  if (pathname.startsWith('/super-admin')) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    if (role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(
        new URL(getDefaultRouteForRole(role), req.url),
      );
    }

    return NextResponse.next();
  }

  if (pathname.startsWith('/dashboard')) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    if (!['SUPER_ADMIN', 'ADMIN', 'OPERATOR'].includes(role)) {
      return NextResponse.redirect(
        new URL(getDefaultRouteForRole(role), req.url),
      );
    }

    return NextResponse.next();
  }

  if (pathname.startsWith('/driver')) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    if (role !== 'DRIVER') {
      return NextResponse.redirect(
        new URL(getDefaultRouteForRole(role), req.url),
      );
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/super-admin/:path*', '/dashboard/:path*', '/driver/:path*'],
};