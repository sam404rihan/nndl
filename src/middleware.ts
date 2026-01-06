import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * MIDDLEWARE ROLE: Authentication & Authorization Gateway
 * 
 * This middleware runs on EVERY request to protected routes and serves as the
 * first line of defense in the NNDL Lab Management System's security architecture.
 * 
 * Core Responsibilities:
 * 1. Session Management - Syncs authentication cookies across requests
 * 2. Authentication Enforcement - Blocks unauthenticated users from dashboard
 * 3. Route Protection - Prevents logged-in users from accessing login page
 * 4. Role-Based Access Control - Restricts admin routes to admin users only
 * 
 * Security Features:
 * - Session-only cookies (expire on browser close) for HIPAA compliance
 * - Real-time role verification from database
 * - Automatic redirects for unauthorized access attempts
 * - Works in tandem with PostgreSQL Row Level Security (RLS)
 * 
 * @see MIDDLEWARE.md for complete documentation
 */
export async function middleware(request: NextRequest) {
  // 1. Create an unmodified response
  // This response will be returned at the end to ensure cookies are synced
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 2. Create the Supabase Client with cookie handlers
  // This client manages authentication state across server and client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        /**
         * Cookie setter with HIPAA-compliant session-only configuration.
         * Removes maxAge and expires to ensure cookies expire on browser close,
         * preventing unauthorized access on shared workstations.
         */
        set(name: string, value: string, options: CookieOptions) {
          // SECURITY: Remove maxAge and expires to create session-only cookies
          // Cookies will expire when browser closes (HIPAA requirement)
          const { maxAge, expires, ...sessionOptions } = options;

          // Sync cookies in both request and response
          request.cookies.set({ name, value, ...sessionOptions });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...sessionOptions });
        },
        remove(name: string, options: CookieOptions) {
          // Clear cookies from both request and response
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

  // 3. Verify User Authentication Status
  // Fetches the current user from the session (if exists)
  const { data: { user } } = await supabase.auth.getUser();

  // --- ROUTE PROTECTION LOGIC ---
  // These checks implement the security model for the application

  // CASE A: Unauthenticated Access Protection
  // If user is NOT logged in AND trying to access dashboard routes
  // Action: Redirect to login page
  // Purpose: Prevent unauthorized access to patient data and system functionality
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // CASE B: Authenticated User on Login Page
  // If user IS logged in AND trying to access login page
  // Action: Redirect to dashboard
  // Purpose: Improve UX by preventing redundant login attempts
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // CASE C: Role-Based Access Control (Admin-Only Routes)
  // Protects sensitive routes that require admin privileges:
  // - /dashboard/admin/* - Admin management interface
  // - /dashboard/tests/* - Test catalog editing (sensitive operation)
  if (user && (
    request.nextUrl.pathname.startsWith('/dashboard/admin') ||
    request.nextUrl.pathname.startsWith('/dashboard/tests')
  )) {
    // Fetch the user's role from the profiles table
    // This is a real-time check to ensure role changes take effect immediately
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // If user is NOT an admin, deny access
    // Action: Redirect to general dashboard
    // Security: Even if RLS would block data access, we prevent route access entirely
    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // 4. Return the Response
  // CRITICAL: This syncs all cookie changes back to the browser
  // Without this, authentication state would be lost across requests
  return response;
}

/**
 * Matcher Configuration: Defines which routes trigger this middleware
 * 
 * Matched routes:
 * - /dashboard - Main dashboard
 * - /dashboard/* - All dashboard sub-routes (patients, orders, results, admin, etc.)
 * - /login - Login page
 * 
 * Excluded routes (for performance):
 * - / - Home page
 * - /_next/* - Next.js internals and static assets
 * - /api/* - API routes (handled separately if needed)
 */
export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};