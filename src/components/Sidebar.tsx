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
  UserCog,
  Receipt
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

  // Helper to check if path is active (exact or starts with)
  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === path;
    }
    return pathname.startsWith(path);
  };

  // Modern clinical sidebar link styling
  const linkClass = (path: string) => {
    const active = isActive(path);
    return `
      group relative flex items-center gap-3 px-3 py-2.5 rounded-lg 
      transition-all duration-200 text-sm font-medium
      ${active
        ? 'bg-white/10 text-white shadow-sm'
        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
      }
    `;
  };

  if (loading) {
    return (
      <div className="w-64 shrink-0" style={{ background: '#1E293B' }}>
        <div className="h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <aside 
      className="w-64 h-screen flex flex-col shrink-0 border-r"
      style={{ 
        background: '#1E293B',
        borderColor: '#334155'
      }}
    >

      {/* --- HEADER --- */}
      <div className="p-5 border-b" style={{ borderColor: '#334155' }}>
        <div className="flex items-center gap-3">
          <LabOSIcon className="w-9 h-9" style={{ color: '#4A6FA5' }} />
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">LabOS</h1>
            <p className="text-xs text-slate-400 mt-0.5">Clinical Analytics</p>
          </div>
        </div>
      </div>

      {/* --- NAVIGATION --- */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">

        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 mt-2 px-3">
          Operations
        </p>

        <Link href="/dashboard" className={linkClass('/dashboard')}>
          {isActive('/dashboard') && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r" 
                 style={{ background: '#4A6FA5' }}></div>
          )}
          <LayoutDashboard className="w-5 h-5 shrink-0" />
          <span>Dashboard</span>
        </Link>

        <Link href="/dashboard/patients" className={linkClass('/dashboard/patients')}>
          {isActive('/dashboard/patients') && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r" 
                 style={{ background: '#4A6FA5' }}></div>
          )}
          <Users className="w-5 h-5 shrink-0" />
          <span>Patients</span>
        </Link>

        <Link href="/dashboard/orders" className={linkClass('/dashboard/orders')}>
          {isActive('/dashboard/orders') && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r" 
                 style={{ background: '#4A6FA5' }}></div>
          )}
          <FileText className="w-5 h-5 shrink-0" />
          <span>Orders</span>
        </Link>

        <Link href="/dashboard/results" className={linkClass('/dashboard/results')}>
          {isActive('/dashboard/results') && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r" 
                 style={{ background: '#4A6FA5' }}></div>
          )}
          <TestTube className="w-5 h-5 shrink-0" />
          <span>Lab Results</span>
        </Link>

        <Link href="/dashboard/invoices" className={linkClass('/dashboard/invoices')}>
          {isActive('/dashboard/invoices') && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r" 
                 style={{ background: '#4A6FA5' }}></div>
          )}
          <Receipt className="w-5 h-5 shrink-0" />
          <span>Invoices</span>
        </Link>

        {/* --- ADMIN SECTION (Conditional) --- */}
        {/* --- ADMIN SECTION (Conditional) --- */}
        {role === 'admin' && (
          <>
            <div className="my-3 border-t" style={{ borderColor: '#334155' }} />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-3">
              Administration
            </p>

            <Link href="/dashboard/admin" className={linkClass('/dashboard/admin')}>
              {isActive('/dashboard/admin') && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r" 
                     style={{ background: '#4A6FA5' }}></div>
              )}
              <Activity className="w-5 h-5 shrink-0" />
              <span>Analytics</span>
            </Link>

            <Link href="/dashboard/tests" className={linkClass('/dashboard/tests')}>
              {isActive('/dashboard/tests') && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r" 
                     style={{ background: '#4A6FA5' }}></div>
              )}
              <TestTube className="w-5 h-5 shrink-0" />
              <span>Test Catalog</span>
            </Link>

            <Link href="/dashboard/admin/users" className={linkClass('/dashboard/admin/users')}>
              {isActive('/dashboard/admin/users') && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r" 
                     style={{ background: '#4A6FA5' }}></div>
              )}
              <UserCog className="w-5 h-5 shrink-0" />
              <span>Staff Management</span>
            </Link>

            <Link href="/dashboard/admin/audit" className={linkClass('/dashboard/admin/audit')}>
              {isActive('/dashboard/admin/audit') && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r" 
                     style={{ background: '#4A6FA5' }}></div>
              )}
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span>Audit Logs</span>
            </Link>

            <Link href="/dashboard/admin/settings" className={linkClass('/dashboard/admin/settings')}>
              {isActive('/dashboard/admin/settings') && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r" 
                     style={{ background: '#4A6FA5' }}></div>
              )}
              <Settings className="w-5 h-5 shrink-0" />
              <span>Settings</span>
            </Link>
          </>
        )}
      </nav>

      {/* --- FOOTER --- */}
      <div className="p-3 border-t" style={{ borderColor: '#334155' }}>
        <SignOutButton />
      </div>
    </aside>
  );
}