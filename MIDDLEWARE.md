# Middleware Role in NNDL Lab Management System

## Overview

The middleware in this NNDL Lab Management System (`src/middleware.ts`) serves as a **critical security layer** that runs on every request before it reaches the application pages. It acts as a gatekeeper for authentication and authorization, ensuring HIPAA compliance and role-based access control.

## Core Responsibilities

### 1. **Session Management & Cookie Synchronization**

The middleware maintains Supabase authentication sessions by managing cookies across requests:

```typescript
// Creates a Supabase client with cookie handlers
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      get(name: string) { ... },
      set(name: string, value: string, options: CookieOptions) { ... },
      remove(name: string, options: CookieOptions) { ... }
    }
  }
);
```

**Key Feature**: Session cookies are converted to **session-only cookies** (removed `maxAge` and `expires`) that expire when the browser closes, enhancing security for HIPAA compliance.

### 2. **Authentication Enforcement**

The middleware verifies user authentication status on every protected route:

```typescript
const { data: { user } } = await supabase.auth.getUser();
```

**CASE A - Unauthenticated Access to Dashboard**:
- **Condition**: User is not logged in but tries to access `/dashboard/*`
- **Action**: Redirects to `/login`
- **Purpose**: Prevents unauthorized access to patient data and system functionality

```typescript
if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
  return NextResponse.redirect(new URL('/login', request.url));
}
```

### 3. **Login Redirection for Authenticated Users**

**CASE B - Authenticated User Accessing Login Page**:
- **Condition**: User is already logged in but navigates to `/login`
- **Action**: Redirects to `/dashboard`
- **Purpose**: Improves UX by preventing redundant login attempts

```typescript
if (user && request.nextUrl.pathname === '/login') {
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
```

### 4. **Role-Based Access Control (RBAC)**

**CASE C - Admin-Only Route Protection** (The Security Layer):
- **Protected Routes**: 
  - `/dashboard/admin/*` - Admin management pages
  - `/dashboard/tests/*` - Test catalog management
- **Mechanism**: Fetches user role from the `profiles` table
- **Authorization Logic**:
  ```typescript
  if (user && (
    request.nextUrl.pathname.startsWith('/dashboard/admin') ||
    request.nextUrl.pathname.startsWith('/dashboard/tests')
  )) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
  ```

**Security Impact**:
- **Technicians** are blocked from accessing:
  - User management (`/dashboard/admin/users`)
  - Audit logs (`/dashboard/admin/audit`)
  - Analytics dashboard (`/dashboard/admin`)
  - Lab settings (`/dashboard/admin/settings`)
  - Test catalog editing (`/dashboard/tests`)
- **Admins** have unrestricted access to all routes

### 5. **Cookie Persistence Across Requests**

The middleware ensures authentication cookies are properly set in both the request and response:

```typescript
response.cookies.set({ name, value, ...sessionOptions });
```

This is **crucial** for maintaining session state across page navigations and API calls.

---

## Security Architecture

### Multi-Layer Defense

The NNDL system implements **defense in depth** with multiple security layers:

1. **Middleware** (Edge Security) - This file
   - Runs on every request at the edge
   - Fast, efficient route-based protection
   - Prevents unauthorized page access before rendering

2. **Row Level Security (RLS)** - Database level
   - PostgreSQL policies enforce data access rules
   - Even if middleware is bypassed, database blocks unauthorized queries
   - Mathematically unbypassable (zero-trust model)

3. **Audit Logging** - Compliance layer
   - Database triggers capture all critical actions
   - Immutable audit trail for HIPAA compliance

### Why Middleware is Essential

**Without middleware**, the system would have critical vulnerabilities:

❌ **Problem**: Users could manually navigate to admin URLs  
✅ **Solution**: Middleware intercepts and redirects unauthorized requests

❌ **Problem**: Session cookies might not sync properly across requests  
✅ **Solution**: Middleware ensures cookie consistency on every request

❌ **Problem**: Logged-in users could access login page repeatedly  
✅ **Solution**: Middleware redirects authenticated users to dashboard

❌ **Problem**: Technicians could attempt to access admin pages  
✅ **Solution**: Middleware blocks access before the page even loads

---

## Middleware Configuration

### Matcher Pattern

The middleware only runs on specific routes:

```typescript
export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
```

**Matched Routes**:
- `/dashboard` - Main dashboard
- `/dashboard/*` - All dashboard sub-routes (patients, orders, results, admin, etc.)
- `/login` - Login page

**Excluded Routes** (No middleware execution):
- `/` - Home page
- `/_next/*` - Next.js internals
- `/api/*` - API routes (handled separately)
- Static files

### Performance Optimization

By limiting the matcher to only protected routes, the middleware:
- Reduces execution overhead on public pages
- Speeds up static asset delivery
- Focuses security checks where they matter most

---

## HIPAA Compliance Features

### 1. Session Expiration on Browser Close

```typescript
const { maxAge, expires, ...sessionOptions } = options;
```

By removing `maxAge` and `expires` from cookie options, sessions automatically expire when the browser closes, preventing unauthorized access on shared workstations.

### 2. Real-Time Authorization Checks

Every request verifies:
- User authentication status
- User role from the database
- Route authorization

This ensures **zero tolerance** for stale permissions or role changes.

### 3. Audit-Friendly Design

The middleware works in tandem with database audit triggers:
- Middleware controls **who can access** routes
- Audit logs record **who did access** data
- Together, they provide complete access accountability

---

## Common Scenarios

### Scenario 1: Technician Tries to Access Admin Dashboard

1. **Request**: Technician navigates to `/dashboard/admin`
2. **Middleware Execution**:
   - Checks user authentication ✅ (logged in)
   - Detects admin route ⚠️
   - Queries `profiles` table for role
   - Finds role = `'technician'` ❌
3. **Result**: Redirects to `/dashboard`
4. **User Experience**: Instant redirect, no error page shown

### Scenario 2: Logged-Out User Tries to View Patients

1. **Request**: User navigates to `/dashboard/patients`
2. **Middleware Execution**:
   - Checks user authentication ❌ (not logged in)
   - Detects dashboard route access attempt
3. **Result**: Redirects to `/login`
4. **Security**: Patient data never loaded or exposed

### Scenario 3: Admin Accesses Test Catalog

1. **Request**: Admin navigates to `/dashboard/tests`
2. **Middleware Execution**:
   - Checks user authentication ✅ (logged in)
   - Detects admin-only route
   - Queries `profiles` table for role
   - Finds role = `'admin'` ✅
3. **Result**: Allows request to proceed
4. **User Experience**: Page loads normally

### Scenario 4: Logged-In User Tries to Access Login

1. **Request**: Authenticated user navigates to `/login`
2. **Middleware Execution**:
   - Checks user authentication ✅ (logged in)
   - Detects login page access
3. **Result**: Redirects to `/dashboard`
4. **User Experience**: Seamless redirect to dashboard

---

## Integration with Other Components

### 1. Authentication (Server Actions)

**File**: `src/app/auth/actions.ts`

The middleware complements server-side auth actions:
- `signIn()` creates the session
- `signOut()` destroys the session
- **Middleware** validates the session on every request

### 2. Supabase Client

**Files**: `src/lib/supabase.ts`, `src/lib/serverCrypto.ts`

The middleware uses the same Supabase client configuration as the rest of the app, ensuring consistency in:
- Cookie management
- Session handling
- JWT token validation

### 3. Database RLS Policies

**File**: `supabase/migrations/secure_role_based_rls_v3_clean_slate.sql`

The middleware is the **first line of defense**, while RLS is the **last line of defense**:

| Layer | Location | Purpose |
|-------|----------|---------|
| Middleware | Next.js Edge | Block unauthorized routes |
| RLS Policies | PostgreSQL | Block unauthorized data queries |

Even if middleware fails, RLS ensures data security at the database level.

---

## Troubleshooting

### Issue: Redirect Loop Between `/login` and `/dashboard`

**Cause**: Session cookie not being set properly  
**Solution**: Ensure Supabase credentials are correct in `.env.local` and middleware is properly syncing cookies

### Issue: Admin Cannot Access `/dashboard/admin`

**Cause**: Role not set correctly in `profiles` table  
**Solution**: Run SQL query to verify and update:
```sql
UPDATE profiles SET role = 'admin' WHERE id = 'user_id_here';
```

### Issue: Middleware Not Running

**Cause**: Route not matched by the `matcher` config  
**Solution**: Verify the route path is covered by `/dashboard/:path*` or `/login`

### Issue: Session Expires Immediately

**Cause**: Cookie options being overridden elsewhere  
**Solution**: Check that no other code is setting `maxAge` or `expires` on auth cookies

---

## Best Practices

### ✅ DO:
- Keep the middleware logic lightweight and fast
- Always return the response object to sync cookies
- Use database queries sparingly (only for role checks)
- Log security-relevant events in audit logs

### ❌ DON'T:
- Add heavy computation or external API calls
- Bypass middleware for "convenience" during development
- Store sensitive data in cookies
- Remove the matcher config (it optimizes performance)

---

## Future Enhancements

Potential improvements to the middleware:

1. **Rate Limiting**: Add request throttling to prevent brute-force attacks
2. **IP Whitelisting**: Restrict admin access to specific IP ranges
3. **Multi-Factor Authentication**: Verify MFA tokens in middleware
4. **Session Timeout**: Add inactivity timeout logic
5. **Geolocation Blocking**: Block access from unauthorized countries/regions

---

## Summary

The middleware in the NNDL Lab Management System is a **critical security component** that:

✅ Enforces authentication on all protected routes  
✅ Implements role-based access control for admin features  
✅ Synchronizes session cookies across requests  
✅ Redirects authenticated users away from login  
✅ Supports HIPAA compliance with session-only cookies  
✅ Works in tandem with database RLS for multi-layer security  

**Without this middleware, the application would be vulnerable to unauthorized access, making it impossible to maintain HIPAA compliance and data security.**

---

## Related Documentation

- [README.md](./README.md) - Project overview
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - File structure
- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Setup instructions
- [SCHEMA_CHANGES.md](./SCHEMA_CHANGES.md) - Database schema

For questions or issues:
- **Supabase Middleware**: [Supabase Next.js Auth Documentation](https://supabase.com/docs/guides/auth/server-side/nextjs)
- **Project Issues**: Create an issue in the project repository
- **Security Concerns**: Contact the project maintainer for security-related questions
