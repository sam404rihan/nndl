"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { decryptData } from '@/lib/crypto';
import { Search, FilePlus, Clock } from 'lucide-react';
import Link from 'next/link';

export default function PatientDirectory() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [recentPatients, setRecentPatients] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Patient Directory</h1>

        <Link
          href="/dashboard/patients/register"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 transition font-semibold"
        >
          <FilePlus size={18} /> New Registration
        </Link>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search by name, phone, email, or patient ID..."
            className="w-full p-3 border-2 border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setHasSearched(false);
                setResults([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={searching}
          className="bg-slate-800 hover:bg-slate-900 text-white px-6 rounded-lg font-semibold transition disabled:opacity-50"
        >
          {searching ? 'Searching...' : <Search />}
        </button>
      </form>

      {/* Results Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden border-2 border-slate-300">
        {/* Header with context */}
        {showingRecent && (
          <div className="px-6 py-3 bg-blue-50 border-b-2 border-blue-200 flex items-center gap-2">
            <Clock size={16} className="text-blue-600" />
            <span className="text-sm font-semibold text-blue-800">Recent Patients</span>
            <span className="text-xs text-blue-600">• Click to view history or create order</span>
          </div>
        )}

        {hasSearched && results.length === 0 && (
          <div className="px-6 py-3 bg-yellow-50 border-b-2 border-yellow-200 flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-yellow-800">No patients found for "{query}"</span>
              <span className="text-xs text-yellow-600 ml-2">• Try a different search or register a new patient</span>
            </div>
            <button
              onClick={() => {
                setQuery('');
                setHasSearched(false);
                setResults([]);
              }}
              className="text-xs font-semibold text-yellow-700 hover:text-yellow-900 underline"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Table Scaffold (always visible) */}
        <table className="min-w-full divide-y-2 divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Patient ID</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Age / Gender</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-100">
            {displayedPatients.length > 0 ? (
              displayedPatients.map((p) => {
                const age = p.dob ? Math.floor((Date.now() - new Date(p.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : '—';
                return (
                  <tr key={p.id} className="hover:bg-blue-50 transition group">
                    <td className="px-6 py-4 text-xs font-mono text-slate-500">
                      <Link href={`/dashboard/patients/${p.id}`} className="hover:text-blue-600">
                        {p.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/patients/${p.id}`} className="font-semibold text-slate-900 hover:text-blue-600">
                        {p.first_name} {p.last_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div>{p.contact}</div>
                      <div className="text-xs text-slate-400">{p.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{age} yrs • {p.gender || '—'}</td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/patients/${p.id}/new-order`}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-sm border-2 border-blue-300 px-3 py-1 rounded hover:bg-blue-50 transition inline-block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        + New Order
                      </Link>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="text-slate-400">
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">No patients to display</p>
                    <p className="text-xs mt-1">Search for a patient or register a new one</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}