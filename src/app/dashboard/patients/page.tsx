"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { decryptData } from '@/lib/crypto';
import { Search, FilePlus, Clock, User, Phone, Mail, Calendar, Filter, Users, X } from 'lucide-react';
import Link from 'next/link';

export default function PatientDirectory() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [recentPatients, setRecentPatients] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Load recent patients on mount and when page becomes visible
  useEffect(() => {
    loadRecentPatients();

    // Reload when window gains focus (e.g., after navigating back)
    const handleFocus = () => {
      loadRecentPatients();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const loadRecentPatients = async () => {
    const { data } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      const decrypted = data.map(p => ({
        ...p,
        first_name: decryptData(p.first_name),
        last_name: decryptData(p.last_name),
        contact: decryptData(p.contact_number)
      }));
      setRecentPatients(decrypted);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setHasSearched(true);

    const searchTerm = query.toLowerCase().trim();

    // Since names are encrypted, we need to fetch all patients and filter client-side
    // Only use database filters for non-encrypted fields (email, contact, id)
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      const decrypted = data.map(p => ({
        ...p,
        first_name: decryptData(p.first_name),
        last_name: decryptData(p.last_name),
        contact: decryptData(p.contact_number)
      }));

      // Filter by all fields (client-side)
      const filtered = decrypted.filter(p => {
        const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
        const firstName = p.first_name.toLowerCase();
        const lastName = p.last_name.toLowerCase();

        return fullName.includes(searchTerm) ||
          firstName.includes(searchTerm) ||
          lastName.includes(searchTerm) ||
          p.email?.toLowerCase().includes(searchTerm) ||
          p.contact?.includes(query) ||
          p.id === query;
      });

      setResults(filtered.slice(0, 20)); // Limit to 20 results
    }
    setSearching(false);
  };

  const displayedPatients = hasSearched ? results : recentPatients;
  const showingRecent = !hasSearched && recentPatients.length > 0;

  return (
    <div className="min-h-screen" style={{ background: '#F8F9FB' }}>
      {/* Header */}
      <div className="border-b" style={{
        background: 'white',
        borderColor: 'rgba(0,0,0,0.06)'
      }}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-5">
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
                  Patient Directory
                </h1>
                <p className="mt-1 text-sm font-medium" style={{ color: '#6B7280' }}>
                  Search and manage patient records
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ 
                background: '#DBEAFE',
                border: '1px solid #2563EB'
              }}>
                <span className="text-sm font-bold" style={{ color: '#2563EB' }}>{recentPatients.length} Recent</span>
              </div>

              <Link
                href="/dashboard/patients/register"
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold transition-all text-sm"
                style={{
                  background: '#2563EB',
                  color: 'white'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#1D4ED8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#2563EB';
                }}
              >
                <FilePlus size={18} /> New Registration
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Search Bar */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by name, phone, email, or patient ID..."
              className="w-full pl-4 pr-12 py-3 rounded-lg border font-medium transition-all focus:outline-none text-sm"
              style={{
                borderColor: query ? '#2563EB' : '#E5E7EB',
                background: 'white',
                color: '#1F2937'
              }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch(e as any);
                }
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setHasSearched(false);
                  setResults([]);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full transition-all"
                style={{ color: '#9CA3AF' }}
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-8 py-3.5 rounded-xl font-semibold transition-all disabled:opacity-50 hover:shadow-lg"
            style={{
              background: '#4A6FA5',
              color: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Status Banner */}
        {showingRecent && (
          <div className="px-4 py-2 rounded-lg flex items-center gap-2" style={{
            background: '#EFF6FF',
            border: '1px solid #DBEAFE'
          }}>
            <span className="text-xs font-medium" style={{ color: '#3B82F6' }}>Last 10 registered</span>
          </div>
        )}

        {hasSearched && results.length === 0 && (
          <div className="px-5 py-3 rounded-xl flex items-center justify-between" style={{
            background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
            border: '1px solid #FCD34D'
          }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#F59E0B' }}>
                <Search size={16} style={{ color: 'white' }} />
              </div>
              <div>
                <span className="text-sm font-bold" style={{ color: '#92400E' }}>No Results</span>
                <span className="text-xs ml-2" style={{ color: '#D97706' }}>Try a different search term</span>
              </div>
            </div>
            <button
              onClick={() => {
                setQuery('');
                setHasSearched(false);
                setResults([]);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-white/50"
              style={{ color: '#D97706' }}
            >
              Clear Search
            </button>
          </div>
        )}

        {/* Patient Cards Grid */}
        {displayedPatients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedPatients.map((p) => {
              const age = p.dob ? Math.floor((Date.now() - new Date(p.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;
              const gender = p.gender || 'Not specified';
              const registeredAt = new Date(p.created_at);
              const now = new Date();
              const diffMs = now.getTime() - registeredAt.getTime();
              const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
              const diffDays = Math.floor(diffHours / 24);
              
              let timeAgo;
              if (diffHours < 1) timeAgo = 'Just now';
              else if (diffHours < 24) timeAgo = `${diffHours}h ago`;
              else if (diffDays === 1) timeAgo = 'Yesterday';
              else if (diffDays < 7) timeAgo = `${diffDays}d ago`;
              else timeAgo = registeredAt.toLocaleDateString();
              
              return (
                <div
                  key={p.id}
                  className="group transition-all relative"
                  style={{
                    background: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    border: '1px solid rgba(0,0,0,0.05)',
                    overflow: 'hidden'
                  }}
                >
                  {/* Left accent stripe */}
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 transition-opacity" style={{
                    background: '#2563EB',
                    opacity: 0.4
                  }} />
                  
                  {/* Card Content - Clickable area */}
                  <Link
                    href={`/dashboard/patients/${p.id}`}
                    className="block p-4 pl-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Patient Name + Demographics */}
                        <div className="flex items-baseline gap-2">
                          <h3 className="font-semibold text-base truncate" style={{ color: '#1F2937' }}>
                            {p.first_name} {p.last_name}
                          </h3>
                          <span className="text-sm flex-shrink-0" style={{ color: '#6B7280' }}>
                            {age ? `${age}` : '—'}
                          </span>
                        </div>
                        
                        {/* Gender + Patient ID */}
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs" style={{ color: '#9CA3AF' }}>
                            {gender}
                          </span>
                          <span className="text-xs" style={{ color: '#D1D5DB' }}>•</span>
                          <span className="text-xs font-mono" style={{ color: '#9CA3AF' }}>
                            {p.patient_no || p.id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                        
                        {/* Registration time */}
                        <p className="text-xs mt-1.5" style={{ color: '#6B7280' }}>
                          Registered {timeAgo}
                        </p>
                      </div>
                      
                      {/* Navigation Arrow */}
                      <div className="flex-shrink-0 self-center transition-transform group-hover:translate-x-0.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                          <path d="M9 18l6-6-6-6"/>
                        </svg>
                      </div>
                    </div>
                  </Link>
                  
                  {/* Action Button - Subtle */}
                  <div className="px-4 pb-4 pl-5 pt-2 border-t" style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
                    <Link
                      href={`/dashboard/patients/${p.id}/new-order`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
                      style={{
                        color: '#6B7280'
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#2563EB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#6B7280';
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                      New Order
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : !showingRecent && !hasSearched ? (
          <div className="text-center py-20 rounded-xl" style={{
            background: 'white',
            border: '2px dashed rgba(0,0,0,0.1)'
          }}>
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#F3F4F6' }}>
              <Search size={32} style={{ color: '#9CA3AF' }} />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: '#1F2937' }}>No Patients Yet</h3>
            <p className="text-sm mb-4" style={{ color: '#6B7280' }}>Search for a patient or register a new one to get started</p>
            <Link
              href="/dashboard/patients/register"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all"
              style={{
                background: '#4A6FA5',
                color: 'white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              <FilePlus size={18} /> Register New Patient
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}