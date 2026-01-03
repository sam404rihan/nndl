"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

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

    // Load settings if allowed
    fetchSettings();
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from('lab_settings').select('*').single();
    if (data) setSettings(data);
  };

  const handleLogoUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `logo-${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('assets').upload(fileName, file);

    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(fileName);
      setSettings({ ...settings, logo_url: publicUrl });
    }
    setUploading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await supabase.from('lab_settings').upsert({ id: 1, ...settings });
    alert("Settings Saved!");
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-xl shadow mt-6">
      <h2 className="text-2xl font-bold mb-6">Lab Settings</h2>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-bold mb-2">Lab Name</label>
          <input
            value={settings.lab_name || ''}
            onChange={e => setSettings({ ...settings, lab_name: e.target.value })}
            className="w-full border p-2 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-bold mb-2">Address</label>
          <textarea
            value={settings.address || ''}
            onChange={e => setSettings({ ...settings, address: e.target.value })}
            className="w-full border p-2 rounded" rows={3}
          />
        </div>
        <div>
          <label className="block text-sm font-bold mb-2">Phone / Contact</label>
          <input
            value={settings.phone || ''}
            onChange={e => setSettings({ ...settings, phone: e.target.value })}
            className="w-full border p-2 rounded"
          />
        </div>

        <div className="border p-4 rounded bg-slate-50">
          <label className="block text-sm font-bold mb-2">Logo Upload</label>
          <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
          {settings.logo_url && (
            <img src={settings.logo_url} alt="Logo Preview" className="h-16 mt-4 object-contain" />
          )}
        </div>

        <button type="submit" disabled={loading || uploading} className="bg-blue-600 text-white px-6 py-2 rounded font-bold">
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}