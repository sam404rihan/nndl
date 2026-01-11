import { createBrowserClient } from '@supabase/ssr';

// This client is for use in Client Components (like the Login Page)
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      get(name) {
        if (typeof document === 'undefined') return '';
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? match[2] : '';
      },
      set(name, value, options) {
        if (typeof document === 'undefined') return;
        // Force session cookie definitions by removing maxAge and expires
        // @ts-ignore
        const { maxAge, expires, ...rest } = options;

        let cookieString = `${name}=${value}`;
        if (rest.path) cookieString += `; path=${rest.path}`;
        if (rest.domain) cookieString += `; domain=${rest.domain}`;
        if (rest.sameSite) cookieString += `; samesite=${rest.sameSite}`;
        if (rest.secure) cookieString += `; secure`;

        document.cookie = cookieString;
      },
      remove(name, options) {
        if (typeof document === 'undefined') return;

        let cookieString = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        if (options?.path) cookieString += `; path=${options.path}`;
        if (options?.domain) cookieString += `; domain=${options.domain}`;
        if (options?.sameSite) cookieString += `; samesite=${options.sameSite}`;
        if (options?.secure) cookieString += `; secure`;

        document.cookie = cookieString;
      }
    }
  }
);