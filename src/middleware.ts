import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // 1. Create an unmodified response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 2. Create the Supabase Client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Keep the cookie in the browser
          // REMOVED maxAge and expires to force a session cookie (expires on browser close)
          const { maxAge, expires, ...sessionOptions } = options;

          request.cookies.set({ name, value, ...sessionOptions });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...sessionOptions });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // 3. Get User Session
  const { data: { user } } = await supabase.auth.getUser();

  // --- PROTECTION LOGIC ---

  // CASE A: Not Logged In -> Trying to access Dashboard
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // CASE B: Logged In -> Trying to access Login
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // CASE C: Admin Route Protection (The Security Layer)
  // Protects /admin subroutes AND the sensitive /tests catalog
  if (user && (
    request.nextUrl.pathname.startsWith('/dashboard/admin') ||
    request.nextUrl.pathname.startsWith('/dashboard/tests')
  )) {
    // Fetch profile role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // If not admin, kick them back to staff dashboard
    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // 4. Return the response (Crucial for syncing cookies!)
  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};