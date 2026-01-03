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
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Users className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-slate-800">Staff Management</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* --- LEFT: ADD USER FORM --- */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 sticky top-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5" /> Add New Staff
            </h2>

            {msg.text && (
              <div className={`mb-4 p-3 text-sm rounded-lg ${msg.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                {msg.text}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  name="email"
                  type="email"
                  placeholder="staff@medilab.com"
                  required
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Temporary Password</label>
                <input
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Assign Role</label>
                <select name="role" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="technician">Technician (Restricted)</option>
                  <option value="admin">Admin (Full Access)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  * Admins can manage users and view all logs.
                </p>
              </div>

              <button
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-black text-white font-medium py-2.5 rounded-lg transition disabled:opacity-70 flex justify-center items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>

        {/* --- RIGHT: USER LIST --- */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-700">Active Staff Accounts</h3>
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
                {users.length} Users
              </span>
            </div>

            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User / Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{user.email}</div>
                      <div className="text-xs text-gray-400 font-mono">{user.id.slice(0, 8)}...</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-green-100 text-green-800'
                        }`}>
                        {user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                        {user.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-gray-400 hover:text-red-600 transition p-1"
                        title="Revoke Access"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No users found. Create the first one!
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}