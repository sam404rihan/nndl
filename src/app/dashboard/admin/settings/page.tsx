"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Building2, MapPin, Phone, Upload, Check, X, Image as ImageIcon } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

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

  const handleRemoveLogo = () => {
    setSettings({ ...settings, logo_url: null });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    await supabase.from('lab_settings').upsert({ id: 1, ...settings });
    setSaved(true);
    setLoading(false);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="min-h-screen" style={{ background: '#F8F9FB' }}>
      <div className="px-8 py-6 max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: '#1F2937' }}>Lab Settings</h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            Configure your laboratory information and branding
          </p>
        </div>

        {/* Settings Form Card */}
        <div 
          className="overflow-hidden"
          style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.05)'
          }}
        >
          <form onSubmit={handleSave}>
            <div className="p-8 space-y-6">
              {/* Lab Name */}
              <div>
                <label className="block text-sm font-semibold mb-2.5" style={{ color: '#374151' }}>
                  <div className="flex items-center gap-2">
                    <Building2 size={16} style={{ color: '#6B7280' }} />
                    Lab Name
                  </div>
                </label>
                <input
                  value={settings.lab_name || ''}
                  onChange={e => setSettings({ ...settings, lab_name: e.target.value })}
                  placeholder="Enter laboratory name"
                  className="w-full px-4 py-3 rounded-lg outline-none transition-all"
                  style={{
                    border: '1.5px solid #E5E7EB',
                    fontSize: '15px',
                    color: '#1F2937'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#2563EB'}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-semibold mb-2.5" style={{ color: '#374151' }}>
                  <div className="flex items-center gap-2">
                    <MapPin size={16} style={{ color: '#6B7280' }} />
                    Address
                  </div>
                </label>
                <textarea
                  value={settings.address || ''}
                  onChange={e => setSettings({ ...settings, address: e.target.value })}
                  placeholder="Enter laboratory address"
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg outline-none transition-all resize-none"
                  style={{
                    border: '1.5px solid #E5E7EB',
                    fontSize: '15px',
                    color: '#1F2937'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#2563EB'}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold mb-2.5" style={{ color: '#374151' }}>
                  <div className="flex items-center gap-2">
                    <Phone size={16} style={{ color: '#6B7280' }} />
                    Phone / Contact
                  </div>
                </label>
                <input
                  value={settings.phone || ''}
                  onChange={e => setSettings({ ...settings, phone: e.target.value })}
                  placeholder="Enter contact number"
                  className="w-full px-4 py-3 rounded-lg outline-none transition-all"
                  style={{
                    border: '1.5px solid #E5E7EB',
                    fontSize: '15px',
                    color: '#1F2937'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#2563EB'}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold mb-2.5" style={{ color: '#374151' }}>
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#6B7280' }}>
                      <rect width="20" height="16" x="2" y="4" rx="2"/>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                    Email
                  </div>
                </label>
                <input
                  type="email"
                  value={settings.email || ''}
                  onChange={e => setSettings({ ...settings, email: e.target.value })}
                  placeholder="Enter email address"
                  className="w-full px-4 py-3 rounded-lg outline-none transition-all"
                  style={{
                    border: '1.5px solid #E5E7EB',
                    fontSize: '15px',
                    color: '#1F2937'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#2563EB'}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-semibold mb-2.5" style={{ color: '#374151' }}>
                  <div className="flex items-center gap-2">
                    <ImageIcon size={16} style={{ color: '#6B7280' }} />
                    Logo Upload
                  </div>
                </label>
                
                <div 
                  className="p-6 rounded-lg border-2 border-dashed"
                  style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}
                >
                  {settings.logo_url ? (
                    <div className="flex items-center gap-4">
                      <img 
                        src={settings.logo_url} 
                        alt="Lab Logo" 
                        className="h-20 w-20 object-contain rounded-lg"
                        style={{ border: '1px solid #E5E7EB', background: 'white', padding: '8px' }}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: '#374151' }}>Logo uploaded successfully</p>
                        <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>This logo will appear on all reports and receipts</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="px-3 py-2 rounded-lg transition-all flex items-center gap-2"
                        style={{ 
                          border: '1px solid #FCA5A5', 
                          background: '#FEF2F2',
                          color: '#DC2626'
                        }}
                      >
                        <X size={16} />
                        <span className="text-sm font-medium">Remove</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload size={32} className="mx-auto mb-3" style={{ color: '#9CA3AF' }} />
                      <label 
                        className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all"
                        style={{ 
                          background: '#2563EB',
                          color: 'white'
                        }}
                      >
                        <Upload size={16} />
                        {uploading ? 'Uploading...' : 'Choose Logo File'}
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleLogoUpload} 
                          disabled={uploading}
                          className="hidden"
                        />
                      </label>
                      <p className="text-xs mt-3" style={{ color: '#9CA3AF' }}>
                        PNG, JPG or SVG (Max 2MB). Recommended: 500x500px
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer with Save Button */}
            <div 
              className="px-8 py-4 flex items-center justify-between"
              style={{ 
                borderTop: '1px solid #E5E7EB',
                background: '#F9FAFB'
              }}
            >
              <div>
                {saved && (
                  <div className="flex items-center gap-2 text-sm font-medium" style={{ color: '#16A34A' }}>
                    <Check size={16} />
                    Settings saved successfully
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={loading || uploading}
                className="px-6 py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: '#2563EB',
                  color: 'white'
                }}
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>

        {/* Help Text */}
        <div className="mt-4 px-2">
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            <strong>Note:</strong> Changes to lab settings will be reflected across all generated reports, receipts, and official documents.
          </p>
        </div>
      </div>
    </div>
  );
}