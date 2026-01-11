"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { UserPlus, Shield, Trash2, Loader2, Users } from 'lucide-react';

export default function UserManagement() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [users, setUsers] = useState<any[]>([]);

  // 1. Fetch existing users on load
  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  const checkAccessAndLoad = async () => {
    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    // Load data if allowed
    fetchUsers();
  };

  const fetchUsers = async () => {
    // We select from profiles since auth.users is not accessible directly from client
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setUsers(data);
  };

  // 2. Handle New User Creation
  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ type: '', text: '' });

    const formData = new FormData(e.currentTarget);
    const payload = {
      email: formData.get('email'),
      password: formData.get('password'), // Temp password
      role: formData.get('role')
    };

    try {
      const res = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setMsg({ type: 'success', text: `✅ User ${payload.email} created successfully!` });
      (e.target as HTMLFormElement).reset(); // Clear form
      fetchUsers(); // Refresh list
    } catch (err: any) {
      setMsg({ type: 'error', text: `❌ Error: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Delete (Optional Feature - purely database side)
  // Note: Deleting from Auth requires a separate Server Action/API, 
  // currently this just deletes the profile row (soft delete logic usually preferred)
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This effectively removes their access.")) return;

    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (!error) {
      setUsers(users.filter(u => u.id !== id));
    } else {
      alert("Error deleting profile");
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#F8F9FB' }}>
      {/* Header */}
      <div className="border-b" style={{
        background: 'white',
        borderColor: 'rgba(0,0,0,0.06)'
      }}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center" style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                background: '#DBEAFE',
                color: '#2563EB'
              }}>
                <Users size={22} strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#1F2937' }}>
                  Staff Management
                </h1>
                <p className="mt-1 text-sm font-medium" style={{ color: '#6B7280' }}>
                  Manage user accounts and access permissions
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ 
              background: '#DBEAFE',
              border: '1px solid #2563EB'
            }}>
              <span className="text-sm font-bold" style={{ color: '#2563EB' }}>{users.length} Active Users</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* --- LEFT: ADD USER FORM --- */}
          <div className="lg:col-span-1">
            <div className="sticky top-6" style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              border: '1px solid rgba(0,0,0,0.05)'
            }}>
              <div className="p-6 border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="flex items-center justify-center" style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#DBEAFE',
                    color: '#3B82F6'
                  }}>
                    <UserPlus size={18} />
                  </div>
                  <h2 className="text-xl font-bold" style={{ color: '#111827' }}>Add New Staff</h2>
                </div>
              </div>

              <div className="p-6">
                {msg.text && (
                  <div className="mb-5 p-4 text-sm font-medium rounded-xl" style={{
                    background: msg.type === 'error' ? '#FEE2E2' : '#DCFCE7',
                    color: msg.type === 'error' ? '#DC2626' : '#16A34A',
                    border: `1px solid ${msg.type === 'error' ? '#FCA5A5' : '#86EFAC'}`
                  }}>
                    {msg.text}
                  </div>
                )}

                <form onSubmit={handleCreate} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold mb-2" style={{ color: '#374151' }}>
                      Email Address
                    </label>
                    <input
                      name="email"
                      type="email"
                      placeholder="staff@medilab.com"
                      required
                      className="w-full px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all"
                      style={{
                        borderColor: '#E5E7EB',
                        color: '#111827',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2563EB';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#E5E7EB';
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2" style={{ color: '#374151' }}>
                      Temporary Password
                    </label>
                    <input
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all"
                      style={{
                        borderColor: '#E5E7EB',
                        color: '#111827',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2563EB';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#E5E7EB';
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2" style={{ color: '#374151' }}>
                      Assign Role
                    </label>
                    <select 
                      name="role" 
                      className="w-full px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all bg-white"
                      style={{
                        borderColor: '#E5E7EB',
                        color: '#111827',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2563EB';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#E5E7EB';
                      }}
                    >
                      <option value="technician">Technician (Restricted)</option>
                      <option value="admin">Admin (Full Access)</option>
                    </select>
                    <p className="text-xs font-medium mt-2" style={{ color: '#9CA3AF' }}>
                      * Admins can manage users and view all logs.
                    </p>
                  </div>

                  <button
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl font-bold text-sm transition-all flex justify-center items-center gap-2"
                    style={{
                      background: loading ? '#9CA3AF' : '#2563EB',
                      color: 'white',
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) e.currentTarget.style.background = '#1D4ED8';
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) e.currentTarget.style.background = '#2563EB';
                    }}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* --- RIGHT: USER LIST --- */}
          <div className="lg:col-span-2">
            <div style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              border: '1px solid rgba(0,0,0,0.05)',
              overflow: 'hidden'
            }}>
              <div className="px-6 py-5 border-b flex justify-between items-center" style={{
                background: '#F9FAFB',
                borderColor: 'rgba(0,0,0,0.06)'
              }}>
                <h3 className="text-xl font-bold" style={{ color: '#111827' }}>
                  Active Staff Accounts
                </h3>
                <div className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{
                  background: '#DBEAFE',
                  color: '#1E40AF'
                }}>
                  {users.length} USERS
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead style={{ background: 'white' }}>
                    <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      <th className="px-6 py-4 text-left">
                        <span className="text-xs font-bold uppercase" style={{ color: '#6B7280', letterSpacing: '0.05em' }}>
                          User / Email
                        </span>
                      </th>
                      <th className="px-6 py-4 text-left">
                        <span className="text-xs font-bold uppercase" style={{ color: '#6B7280', letterSpacing: '0.05em' }}>
                          Role
                        </span>
                      </th>
                      <th className="px-6 py-4 text-left">
                        <span className="text-xs font-bold uppercase" style={{ color: '#6B7280', letterSpacing: '0.05em' }}>
                          Created
                        </span>
                      </th>
                      <th className="px-6 py-4 text-right">
                        <span className="text-xs font-bold uppercase" style={{ color: '#6B7280', letterSpacing: '0.05em' }}>
                          Action
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, index) => (
                      <tr 
                        key={user.id} 
                        className="transition-colors"
                        style={{ 
                          borderBottom: index !== users.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#F9FAFB';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'white';
                        }}
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold" style={{ color: '#111827' }}>{user.email}</div>
                          <div className="text-xs font-mono" style={{ color: '#9CA3AF' }}>{user.id.slice(0, 8)}...</div>
                        </td>
                        <td className="px-6 py-4">
                          <span 
                            className="px-3 py-1.5 inline-flex items-center text-xs font-bold rounded-lg gap-1"
                            style={{
                              background: user.role === 'admin' ? '#DBEAFE' : '#DCFCE7',
                              color: user.role === 'admin' ? '#2563EB' : '#16A34A'
                            }}
                          >
                            {user.role === 'admin' && <Shield className="w-3 h-3" />}
                            {user.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium" style={{ color: '#6B7280' }}>
                            {new Date(user.created_at).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="p-2 rounded-lg transition-all"
                            style={{ color: '#9CA3AF' }}
                            title="Revoke Access"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#FEE2E2';
                              e.currentTarget.style.color = '#DC2626';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = '#9CA3AF';
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {users.length === 0 && (
                  <div className="p-12 text-center">
                    <Users size={48} className="mx-auto mb-3" style={{ color: '#E5E7EB' }} />
                    <p className="text-base font-medium" style={{ color: '#6B7280' }}>
                      No users found. Create the first one!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}