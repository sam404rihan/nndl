"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { decryptData } from '@/lib/crypto';
import { Download, DollarSign, FileText } from 'lucide-react';
import { generateReceipt } from '@/services/receiptService';

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  const checkAccessAndLoad = async () => {
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

    if (!profile || !['admin', 'technician'].includes(profile.role)) {
      router.push('/dashboard');
      return;
    }

    fetchInvoices();
  };

  const fetchInvoices = async () => {
    setLoading(true);
    
    // Fetch orders
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      setLoading(false);
      return;
    }

    // Fetch all patients (RLS policies may block .in() queries)
    const { data: patientsData, error: patientsError } = await supabase
      .from('patients')
      .select('id, patient_no, first_name, last_name, contact_number');

    if (patientsError) {
      console.error('Error fetching patients:', patientsError);
      setLoading(false);
      return;
    }

    console.log('Full patients data:', patientsData);
    console.log('Patient sample with patient_no:', patientsData?.[0]);

    // Decrypt patient data with error handling
    const decryptedPatients = patientsData.map(p => {
      try {
        const firstName = decryptData(p.first_name);
        const lastName = decryptData(p.last_name);
        const phone = decryptData(p.contact_number);
        
        // Check for decryption failures
        if (firstName.includes('**Decryption Error**') || 
            lastName.includes('**Decryption Error**') ||
            phone.includes('**Decryption Error**')) {
          console.warn(`Decryption issue for patient ${p.id}`);
        }
        
        return {
          id: p.id,
          patient_no: p.patient_no,
          first_name: firstName || 'Unknown',
          last_name: lastName || 'Patient',
          phone: phone || ''
        };
      } catch (error) {
        console.error(`Error decrypting patient ${p.id}:`, error);
        return {
          id: p.id,
          patient_no: p.patient_no || null,
          first_name: 'Unknown',
          last_name: 'Patient',
          phone: ''
        };
      }
    });

    // Create patient map
    const patientsMap = new Map();
    decryptedPatients.forEach(p => patientsMap.set(p.id, p));

    // Map patients to orders
    const invoicesWithPatients = ordersData.map(order => ({
      ...order,
      patients: patientsMap.get(order.patient_id) || { 
        id: order.patient_id,
        patient_no: 'N/A',
        first_name: 'Unknown', 
        last_name: 'Patient', 
        phone: '' 
      }
    }));

    console.log('Invoices loaded:', invoicesWithPatients.length);
    setInvoices(invoicesWithPatients);
    setLoading(false);
  };

  const handleDownloadReceipt = async (orderId: string) => {
    setDownloadingId(orderId);
    try {
      await generateReceipt(orderId);
    } catch (error) {
      console.error('Error generating receipt:', error);
      alert('Failed to generate receipt');
    }
    setDownloadingId(null);
  };

  const downloadCSV = () => {
    // Create CSV headers
    const headers = ['Bill No', 'Patient ID', 'Date', 'Time', 'Amount', 'Payment Status', 'Payment Method'];
    
    // Create CSV rows
    const rows = filteredInvoices.map(inv => {
      const patientId = inv.patients.patient_no || inv.patients.id.slice(0, 8).toUpperCase();
      const date = new Date(inv.created_at).toLocaleDateString('en-IN');
      const time = new Date(inv.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      
      return [
        inv.bill_no || 'PENDING',
        patientId,
        date,
        time,
        inv.total_amount,
        inv.payment_status,
        inv.payment_method || 'N/A'
      ];
    });
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `invoices_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredInvoices = invoices.filter(inv => {
    const firstName = (inv.patients.first_name || '').toLowerCase();
    const lastName = (inv.patients.last_name || '').toLowerCase();
    const billNo = (inv.bill_no || '').toLowerCase();
    const search = searchTerm.toLowerCase();

    return firstName.includes(search) || 
           lastName.includes(search) || 
           billNo.includes(search);
  });

  const totalRevenue = filteredInvoices
    .filter(inv => inv.payment_status === 'paid')
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

  const pendingRevenue = filteredInvoices
    .filter(inv => inv.payment_status === 'pending')
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

  return (
    <div className="min-h-screen" style={{ background: '#F8F9FB' }}>
      <div className="px-8 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: '#1F2937' }}>
            Invoices & Billing
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            Manage all payment receipts and billing records
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div 
            className="p-5 rounded-xl"
            style={{
              background: 'white',
              border: '1px solid rgba(0,0,0,0.05)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
            }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="p-3 rounded-lg"
                style={{ background: 'rgba(34, 197, 94, 0.1)' }}
              >
                <DollarSign size={20} style={{ color: '#22C55E' }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: '#6B7280' }}>Total Revenue (Paid)</p>
                <p className="text-xl font-bold" style={{ color: '#1F2937' }}>
                  ₹{totalRevenue.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div 
            className="p-5 rounded-xl"
            style={{
              background: 'white',
              border: '1px solid rgba(0,0,0,0.05)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
            }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="p-3 rounded-lg"
                style={{ background: 'rgba(59, 130, 246, 0.1)' }}
              >
                <FileText size={20} style={{ color: '#3B82F6' }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: '#6B7280' }}>Total Invoices</p>
                <p className="text-xl font-bold" style={{ color: '#1F2937' }}>
                  {filteredInvoices.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Download */}
        <div 
          className="p-5 rounded-xl mb-6"
          style={{
            background: 'white',
            border: '1px solid rgba(0,0,0,0.05)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
          }}
        >
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Search by patient name or bill number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-lg outline-none transition-all"
              style={{
                border: '1.5px solid #E5E7EB',
                fontSize: '14px',
                color: '#1F2937'
              }}
              onFocus={(e) => e.target.style.borderColor = '#2563EB'}
              onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
            />
            <button
              onClick={downloadCSV}
              className="px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2"
              style={{
                background: '#2563EB',
                color: 'white',
                fontSize: '14px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#1D4ED8'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#2563EB'}
            >
              <Download size={18} />
              Download CSV
            </button>
          </div>
        </div>

        {/* Invoices Table */}
        <div 
          className="rounded-xl overflow-hidden"
          style={{
            background: 'white',
            border: '1px solid rgba(0,0,0,0.05)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
          }}
        >
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#2563EB' }}></div>
              <p className="mt-3 text-sm" style={{ color: '#6B7280' }}>Loading invoices...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={48} className="mx-auto mb-3" style={{ color: '#D1D5DB' }} />
              <p className="font-medium" style={{ color: '#6B7280' }}>No invoices found</p>
              <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
                {searchTerm ? 'Try adjusting your search' : 'Invoices will appear here'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                    <th className="px-6 py-4 text-left text-xs font-semibold" style={{ color: '#6B7280' }}>
                      BILL NO.
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold" style={{ color: '#6B7280' }}>
                      PATIENT
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold" style={{ color: '#6B7280' }}>
                      DATE
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold" style={{ color: '#6B7280' }}>
                      AMOUNT
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold" style={{ color: '#6B7280' }}>
                      PAYMENT
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold" style={{ color: '#6B7280' }}>
                      METHOD
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold" style={{ color: '#6B7280' }}>
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice, idx) => (
                    <tr 
                      key={invoice.id}
                      style={{ 
                        borderBottom: idx < filteredInvoices.length - 1 ? '1px solid #F3F4F6' : 'none'
                      }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-medium" style={{ color: '#1F2937' }}>
                          {invoice.bill_no || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium" style={{ color: '#1F2937' }}>
                            {invoice.patients.first_name} {invoice.patients.last_name}
                          </p>
                          <p className="text-xs font-mono" style={{ color: '#9CA3AF' }}>
                            {invoice.patients.patient_no ? `ID: ${invoice.patients.patient_no}` : `ID: ${invoice.patients.id.slice(0, 8).toUpperCase()}`}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm" style={{ color: '#6B7280' }}>
                          {new Date(invoice.created_at).toLocaleDateString('en-GB')}
                        </p>
                        <p className="text-xs" style={{ color: '#9CA3AF' }}>
                          {new Date(invoice.created_at).toLocaleTimeString('en-GB', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                          ₹{(invoice.total_amount || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span 
                          className="px-2.5 py-1 rounded-full text-xs font-medium"
                          style={
                            invoice.payment_status === 'paid'
                              ? { background: '#D1FAE5', color: '#065F46' }
                              : { background: '#FEF3C7', color: '#92400E' }
                          }
                        >
                          {invoice.payment_status === 'paid' ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm capitalize" style={{ color: '#6B7280' }}>
                          {invoice.payment_method || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDownloadReceipt(invoice.id)}
                          disabled={downloadingId === invoice.id || !invoice.bill_no}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            background: invoice.bill_no ? '#2563EB' : '#E5E7EB',
                            color: invoice.bill_no ? 'white' : '#9CA3AF'
                          }}
                        >
                          <Download size={14} />
                          {downloadingId === invoice.id ? 'Generating...' : 'Receipt'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
