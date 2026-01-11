"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { decryptData } from '@/lib/crypto';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export default function PatientSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    // Note: Since names are encrypted, we can't search them directly with SQL 'LIKE' easily 
    // without deterministic encryption.
    // workaround for MVP: Search by DOB or Email (unencrypted columns) or fetch all & filter (slow).
    // BETTER APPROACH FOR MVP: We search by Contact Number (assuming deterministic encryption or plain).
    // Here we will demonstrate searching by Email or DOB for simplicity.

    const { data } = await supabase
      .from('patients')
      .select('*')
      .or(`email.ilike.%${query}%,contact_number.ilike.%${query}%`) // Searching unencrypted fields
      .limit(5);

    if (data) setResults(data);
  };

  const handleSelect = (patient: any) => {
    // Decrypt names for display or URL usage logic
    router.push(`/dashboard/orders/new?patientId=${patient.id}`);
  };

  return (
    <div className="relative w-full max-w-xl">
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          placeholder="Search by Email or Contact..."
          className="w-full pl-4 pr-4 py-3 rounded-lg border font-medium text-sm transition-all"
          style={{
            borderColor: query ? '#2563EB' : '#E5E7EB',
            background: 'white',
            color: '#1F2937',
            outline: 'none'
          }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>

      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white shadow-xl rounded-lg mt-2 border z-50">
          {results.map(p => (
            <div
              key={p.id}
              onClick={() => handleSelect(p)}
              className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 flex justify-between"
            >
              <div>
                <p className="font-bold">{decryptData(p.first_name)} {decryptData(p.last_name)}</p>
                <p className="text-xs text-gray-500">{p.email}</p>
              </div>
              <div className="text-sm text-blue-600 self-center">New Order →</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}