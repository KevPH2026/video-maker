import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Skip auth pages and generate page (they have their own layouts)
  if (
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/generate' ||
    pathname.startsWith('/generate')
  ) {
    return NextResponse.next();
  }

  // If already has locale, continue
  if (pathname.startsWith('/zh') || pathname.startsWith('/en')) {
    return NextResponse.next();
  }

  // Redirect root to /zh (Chinese as default)
  return NextResponse.redirect(new URL('/zh', request.url));
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
