"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard,
  Users,
  TestTube,
  FileText,
  Settings,
  LogOut,
  ShieldAlert,
  Activity,
  UserCog
} from 'lucide-react';
import SignOutButton from './SignOutButton';
import LabOSIcon from './LabOSIcon';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch User Role on Mount
  useEffect(() => {
    const getRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setRole(profile?.role || 'technician');
      }
      setLoading(false);
    };
    getRole();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Helper to style active links
  const linkClass = (path: string) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${pathname === path
      ? 'bg-blue-600 text-white shadow-md'
      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`;

  if (loading) return <div className="w-64 bg-slate-900 h-screen"></div>;

  return (
    <aside className="w-64 bg-slate-900 h-screen flex flex-col flex-shrink-0 transition-all duration-300">

      {/* --- HEADER --- */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <LabOSIcon className="w-8 h-8" style={{ color: '#3B82F6' }} />
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">LabOS</h1>
            <p className="text-xs text-slate-500 mt-0.5">Laboratory Management System</p>
          </div>
        </div>
      </div>

      {/* --- NAVIGATION --- */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">

        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-2 px-4">
          Operations
        </p>

        <Link href="/dashboard" className={linkClass('/dashboard')}>
          <LayoutDashboard className="w-5 h-5" />
          Dashboard
        </Link>

        <Link href="/dashboard/patients" className={linkClass('/dashboard/patients')}>
          <Users className="w-5 h-5" />
          Patients
        </Link>

        <Link href="/dashboard/orders" className={linkClass('/dashboard/orders')}>
          <FileText className="w-5 h-5" />
          Orders
        </Link>

        <Link href="/dashboard/results" className={linkClass('/dashboard/results')}>
          <TestTube className="w-5 h-5" />
          Lab Results
        </Link>

        {/* --- ADMIN SECTION (Conditional) --- */}
        {role === 'admin' && (
          <>
            <div className="my-4 border-t border-slate-800" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4">
              Administration
            </p>

            <Link href="/dashboard/admin" className={linkClass('/dashboard/admin')}>
              <Activity className="w-5 h-5" />
              Analytics
            </Link>

            <Link href="/dashboard/tests" className={linkClass('/dashboard/tests')}>
              {/* Note: In previous steps we put test catalog at /dashboard/tests, accessible to both but managed by admin. */}
              {/* If you want to move it to admin only section visually: */}
              <TestTube className="w-5 h-5" />
              Test Catalog
            </Link>

            <Link href="/dashboard/admin/users" className={linkClass('/dashboard/admin/users')}>
              <UserCog className="w-5 h-5" />
              Staff Management
            </Link>

            <Link href="/dashboard/admin/audit" className={linkClass('/dashboard/admin/audit')}>
              <ShieldAlert className="w-5 h-5" />
              Audit Logs
            </Link>

            <Link href="/dashboard/admin/settings" className={linkClass('/dashboard/admin/settings')}>
              <Settings className="w-5 h-5" />
              Settings
            </Link>
          </>
        )}
      </nav>

      {/* --- FOOTER --- */}
      <div className="p-4 border-t border-slate-800">
        <SignOutButton />
      </div>
    </aside>
  );
}