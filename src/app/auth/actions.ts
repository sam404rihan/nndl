'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function signIn(email: string, password: string) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // Get IP address and user agent from headers (server-side)
  const { headers } = await import('next/headers');
  const headersList = await headers();
  const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] ||
    headersList.get('x-real-ip') ||
    'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  if (error) {
    // Log failed login attempt for HIPAA compliance
    try {
      await supabase.from('audit_logs').insert({
        action: 'LOGIN_FAILED',
        table_name: 'auth',
        record_id: email,
        performed_by: null,
        timestamp: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent
      });
    } catch (auditError) {
      console.error('Failed to log failed login:', auditError);
    }
    return { error: error.message };
  }

  // Log successful login for HIPAA compliance
  if (data.user) {
    try {
      await supabase.from('audit_logs').insert({
        action: 'LOGIN',
        table_name: 'auth',
        record_id: data.user.id,
        performed_by: data.user.id,
        timestamp: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent
      });
    } catch (auditError) {
      console.error('Failed to log login:', auditError);
      // Don't block login if audit fails
    }
  }

  return { success: true };
}

export async function signOut() {
  // ⚡ FIX: Add 'await' here.
  // In Next.js 15, cookies() returns a Promise.
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );

  // Get user before logging out
  const { data: { user } } = await supabase.auth.getUser();

  // Get IP address and user agent from headers
  const { headers } = await import('next/headers');
  const headersList = await headers();
  const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] ||
    headersList.get('x-real-ip') ||
    'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  // Log logout for HIPAA compliance
  if (user) {
    try {
      await supabase.from('audit_logs').insert({
        action: 'LOGOUT',
        table_name: 'auth',
        record_id: user.id,
        performed_by: user.id,
        timestamp: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent
      });
    } catch (auditError) {
      console.error('Failed to log logout:', auditError);
      // Don't block logout if audit fails
    }
  }

  // Sign out from Supabase (this clears server-side session)
  await supabase.auth.signOut();

  // Explicitly clear all Supabase auth cookies
  const allCookies = cookieStore.getAll();
  for (const cookie of allCookies) {
    if (cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token')) {
      cookieStore.delete({
        name: cookie.name,
        path: '/',
      });
    }
  }

  redirect('/login');
}