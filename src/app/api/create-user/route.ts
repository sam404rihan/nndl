import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // --- PART 1: SETUP CONTEXT CLIENT (To check who is calling the API) ---
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
            // Note: In an API Route, we usually don't set auth cookies, 
            // but the library requires this method definition.
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

    // --- PART 2: SECURITY CHECK ---
    // Get the current user's session based on cookies
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: You are not logged in.' }, { status: 401 });
    }

    // Check if the user is an Admin in the database
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (adminProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: You must be an Admin.' }, { status: 403 });
    }

    // --- PART 3: ADMIN LOGIC (Service Role) ---
    // Now we initialize the "God Mode" client to create the new user
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const body = await request.json();
    const { email, password, role } = body;

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create User in Supabase Auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (createError) {
      throw new Error(createError.message);
    }

    // Create Profile in Database
    if (newUser.user) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: newUser.user.id,
          email: email,
          role: role
        });

      if (profileError) {
        // Cleanup: If profile fails, remove the auth user to keep data clean
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        throw new Error(`Database Error: ${profileError.message}`);
      }

      // Audit Log - Track user creation for HIPAA compliance
      // Use the admin's session to log who created this user
      try {
        const { data: { user: adminUser } } = await supabase.auth.getUser();
        if (adminUser) {
          await supabaseAdmin.from('audit_logs').insert({
            action: 'CREATE',
            table_name: 'profiles',
            record_id: newUser.user.id,
            performed_by: adminUser.id,
            timestamp: new Date().toISOString(),
            metadata: {
              email: email,
              role: role
            }
          });
        }
      } catch (auditError) {
        console.error('Failed to create audit log for user creation:', auditError);
        // Don't fail the user creation if audit logging fails
      }
    }

    return NextResponse.json({ message: 'User created successfully' });

  } catch (error: any) {
    console.error('Create User Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}