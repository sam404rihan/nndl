"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { decryptData } from '@/lib/crypto';
import { getHoursPending } from '@/lib/tat';
import DownloadReportBtn from '@/components/DownloadReportBtn';
import { Clock, CheckCircle, AlertCircle, FileText, ChevronDown, ChevronUp, User, Phone, Calendar, Trash2, CreditCard, Banknote, Smartphone, X, Search, Filter, ClipboardList } from 'lucide-react';

interface OrderTest {
  id: string;
  status: string;
  tests: {
    name: string;
  };
}

interface TestRequest {
  id: string;
  created_at: string;
  status: string;
  payment_status?: string;
  payment_method?: string;
  total_amount?: number;
  patients: {
    first_name: string;
    last_name: string;
    dob: string;
    gender: string;
    contact_number: string;
  };
  order_tests: OrderTest[];
}

export default function TestRequestsList() {
  const [requests, setRequests] = useState<TestRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ orderId: string; patientName: string } | null>(null);
  const [approvingOrderId, setApprovingOrderId] = useState<string | null>(null);
  const [confirmApprove, setConfirmApprove] = useState<{ orderId: string; patientName: string } | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [paymentModalOrder, setPaymentModalOrder] = useState<any | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    const fetchRequests = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
            *,
            patients (first_name, last_name, dob, gender, contact_number),
            order_tests (
                id,
                status,
                tests (name)
            )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        alert('Failed to load orders: ' + (error.message || JSON.stringify(error)));
        setLoading(false);
        return;
      }

      setRequests(data || []);
      setLoading(false);
    };
    fetchRequests();
  }, []);

  const handleDeleteOrder = async (orderId: string, patientName: string) => {
    setConfirmDelete({ orderId, patientName });
  };

  const confirmDeleteOrder = async () => {
    if (!confirmDelete) return;

    const { orderId, patientName } = confirmDelete;
    setConfirmDelete(null);
    setDeletingOrderId(orderId);

    try {
      // Step 1: Get order_test IDs
      const { data: orderTests } = await supabase
        .from('order_tests')
        .select('id')
        .eq('order_id', orderId);

      // Step 2: Delete test_results
      if (orderTests && orderTests.length > 0) {
        const orderTestIds = orderTests.map(ot => ot.id);
        const { error: resultsError } = await supabase
          .from('test_results')
          .delete()
          .in('order_test_id', orderTestIds);

        if (resultsError) {
          console.error('Error deleting test results:', resultsError);
          throw resultsError;
        }
      }

      // Step 3: Delete order_tests
      const { error: testsError } = await supabase
        .from('order_tests')
        .delete()
        .eq('order_id', orderId);

      if (testsError) {
        console.error('Error deleting order tests:', testsError);
        throw testsError;
      }

      // Step 4: Delete order
      const { error: orderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (orderError) {
        console.error('Error deleting order:', orderError);
        throw orderError;
      }

      setRequests(prev => prev.filter(req => req.id !== orderId));
    } catch (error) {
      console.error('Error deleting order:', error);
      alert(`Failed to delete order: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    } finally {
      setDeletingOrderId(null);
    }
  };

  const handleApproveReport = async (orderId: string, patientName: string) => {
    setConfirmApprove({ orderId, patientName });
  };

  const confirmApproveReport = async () => {
    if (!confirmApprove) return;

    const { orderId, patientName } = confirmApprove;
    setConfirmApprove(null);
    setApprovingOrderId(orderId);

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', orderId);

      if (error) {
        console.error('Error approving report:', error);
        throw error;
      }

      // Update local state
      setRequests(prev => prev.map(req =>
        req.id === orderId ? { ...req, status: 'completed' } : req
      ));

      setNotification({ type: 'success', message: `Report for ${patientName} approved successfully!` });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error approving report:', error);
      setNotification({
        type: 'error',
        message: `Failed to approve report: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setApprovingOrderId(null);
    }
  };

  const handleProcessPayment = async () => {
    if (!paymentModalOrder || !selectedPaymentMethod) return;

    setProcessingPayment(true);
    try {
      const { markOrderAsPaid } = await import('@/services/paymentService');
      await markOrderAsPaid(paymentModalOrder.id, selectedPaymentMethod);

      // Update local state
      setRequests(prev => prev.map(req =>
        req.id === paymentModalOrder.id
          ? { ...req, payment_status: 'paid', payment_method: selectedPaymentMethod }
          : req
      ));

      setNotification({
        type: 'success',
        message: `Payment recorded successfully! Method: ${selectedPaymentMethod}`
      });
      setTimeout(() => setNotification(null), 3000);

      // Close modal and reset
      setPaymentModalOrder(null);
      setSelectedPaymentMethod(null);
    } catch (error) {
      console.error('Error processing payment:', error);
      setNotification({
        type: 'error',
        message: `Failed to process payment: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setProcessingPayment(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, string> = {
      'registered': 'Registered',
      'sample_collected': 'Sample Collected',
      'in_process': 'In Process',
      'pending_approval': 'Completed',
      'completed': 'Report Delivered',
      'delivered': 'Report Delivered',
      'pending': 'Registered',
    };
    return statusMap[status] || status;
  };

  const getStatusInfo = (status: string) => {
    if (status === 'pending_approval') return { icon: '⏱', text: 'Pending Approval', color: '#F59E0B', bg: '#FEF3C7', border: '#F59E0B' };
    if (status === 'completed' || status === 'delivered') return { icon: '✓', text: 'Delivered', color: '#059669', bg: '#D1FAE5', border: '#10B981' };
    if (status === 'in_process') return { icon: '⚡', text: 'In Process', color: '#7C3AED', bg: '#EDE9FE', border: '#8B5CF6' };
    if (status === 'sample_collected') return { icon: '📋', text: 'Sample Collected', color: '#2563EB', bg: '#DBEAFE', border: '#3B82F6' };
    return { icon: '○', text: 'Registered', color: '#6B7280', bg: '#F3F4F6', border: '#9CA3AF' };
  };

  const getStatusColor = (status: string) => {
    if (status === 'pending_approval') return 'bg-orange-100 text-orange-800 border-orange-200 font-bold';
    if (status === 'completed' || status === 'delivered') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (status === 'in_process') return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    if (status === 'sample_collected') return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const getAgeDisplay = (createdAt: string) => {
    const hours = getHoursPending(createdAt);
    if (hours < 1) return '<1H';
    if (hours < 24) return `${hours}H`;
    const days = Math.floor(hours / 24);
    return `${days}D`;
  };

  const isOverdue = (createdAt: string) => {
    return getHoursPending(createdAt) > 5;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8F9FB' }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 mx-auto mb-4" style={{
          borderColor: 'rgba(74, 111, 165, 0.2)',
          borderTopColor: '#4A6FA5'
        }}></div>
        <p style={{ color: '#6B7280' }}>Loading orders...</p>
      </div>
    </div>
  );

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
                <ClipboardList size={22} strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#1F2937' }}>
                  Test Requests
                </h1>
                <p className="mt-1 text-sm font-medium" style={{ color: '#6B7280' }}>
                  Manage and track all laboratory test orders
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ 
              background: '#DBEAFE',
              border: '1px solid #2563EB'
            }}>
              <span className="text-sm font-bold" style={{ color: '#2563EB' }}>{requests.length} Total Orders</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="relative">
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter by patient name or test name..."
              className="w-full pl-4 pr-4 py-2.5 rounded-lg border font-medium text-sm transition-all"
              style={{
                borderColor: filterQuery ? '#2563EB' : '#E5E7EB',
                background: 'white',
                color: '#1F2937',
                outline: 'none'
              }}
            />
            {filterQuery && (
              <button
                onClick={() => setFilterQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-all"
                style={{
                  color: '#9CA3AF'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#DC2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#9CA3AF';
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Status Banner */}
        <div className="px-4 py-2 rounded-lg flex items-center gap-2" style={{
          background: '#EFF6FF',
          border: '1px solid #DBEAFE'
        }}>
          <span className="text-xs font-medium" style={{ color: '#3B82F6' }}>All test requests</span>
        </div>

        {filterQuery && requests.filter(req => {
          const query = filterQuery.toLowerCase();
          const patientName = req.patients ? `${decryptData(req.patients.first_name)} ${decryptData(req.patients.last_name)}`.toLowerCase() : '';
          const testNames = req.order_tests.map(ot => ot.tests?.name?.toLowerCase() || '').join(' ');
          return patientName.includes(query) || testNames.includes(query);
        }).length === 0 && (
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
              onClick={() => setFilterQuery('')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-white/50"
              style={{ color: '#D97706' }}
            >
              Clear Search
            </button>
          </div>
        )}

      {requests.filter(req => {
        if (!filterQuery) return true;
        const query = filterQuery.toLowerCase();
        const patientName = req.patients ? `${decryptData(req.patients.first_name)} ${decryptData(req.patients.last_name)}`.toLowerCase() : '';
        const testNames = req.order_tests.map(ot => ot.tests?.name?.toLowerCase() || '').join(' ');
        return patientName.includes(query) || testNames.includes(query);
      }).length === 0 && !filterQuery ? (
        <div className="text-center py-20 rounded-xl" style={{
          background: 'white',
          border: '2px dashed rgba(0,0,0,0.1)'
        }}>
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#F3F4F6' }}>
            <ClipboardList size={32} style={{ color: '#9CA3AF' }} />
          </div>
          <h3 className="text-lg font-bold mb-2" style={{ color: '#1F2937' }}>No Orders Yet</h3>
          <p className="text-sm mb-4" style={{ color: '#6B7280' }}>Create a new test order to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.filter(req => {
            if (!filterQuery) return true;
            const query = filterQuery.toLowerCase();
            const patientName = req.patients ? `${decryptData(req.patients.first_name)} ${decryptData(req.patients.last_name)}`.toLowerCase() : '';
            const testNames = req.order_tests.map(ot => ot.tests?.name?.toLowerCase() || '').join(' ');
            return patientName.includes(query) || testNames.includes(query);
          }).map((req) => {
            const patientName = req.patients
              ? `${decryptData(req.patients.first_name)} ${decryptData(req.patients.last_name)}`
              : 'Unknown';
            const statusInfo = getStatusInfo(req.status);
            const testCount = req.order_tests.length;
            const createdAt = new Date(req.created_at);
            const now = new Date();
            const diffMs = now.getTime() - createdAt.getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffHours / 24);
            
            let timeAgo;
            if (diffHours < 1) timeAgo = 'Just now';
            else if (diffHours < 24) timeAgo = `${diffHours}h ago`;
            else if (diffDays === 1) timeAgo = 'Yesterday';
            else if (diffDays < 7) timeAgo = `${diffDays}d ago`;
            else timeAgo = createdAt.toLocaleDateString();

            return (
              <div
                key={req.id}
                className="group transition-all relative cursor-pointer"
                style={{
                  background: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  border: '1px solid rgba(0,0,0,0.05)',
                  overflow: 'hidden'
                }}
                onClick={() => setExpandedOrderId(expandedOrderId === req.id ? null : req.id)}
              >
                {/* Left accent stripe */}
                <div className="absolute left-0 top-0 bottom-0 w-0.5 transition-opacity" style={{
                  background: statusInfo.color,
                  opacity: 0.4
                }} />
                
                {/* Card Content */}
                <div className="p-4 pl-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Patient Name + Status */}
                      <div className="flex items-baseline gap-2">
                        <h3 className="font-semibold text-base truncate" style={{ color: '#1F2937' }}>
                          {patientName}
                        </h3>
                        <span className="text-xs px-2 py-0.5 rounded font-semibold flex-shrink-0" style={{ 
                          background: statusInfo.bg,
                          color: statusInfo.color 
                        }}>
                          {statusInfo.text}
                        </span>
                      </div>
                      
                      {/* Tests + Order ID */}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs" style={{ color: '#9CA3AF' }}>
                          {testCount} {testCount === 1 ? 'Test' : 'Tests'}
                        </span>
                        <span className="text-xs" style={{ color: '#D1D5DB' }}>•</span>
                        <span className="text-xs font-mono" style={{ color: '#9CA3AF' }}>
                          {req.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                      
                      {/* Time ago */}
                      <p className="text-xs mt-1.5" style={{ color: '#6B7280' }}>
                        Created {timeAgo}
                      </p>
                    </div>
                    
                    {/* Navigation Arrow */}
                    <div className="flex-shrink-0 self-center transition-transform group-hover:translate-x-0.5">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* Expanded Order Modal */}
      {expandedOrderId && requests.find(r => r.id === expandedOrderId) && (() => {
        const req = requests.find(r => r.id === expandedOrderId)!;
        const patientName = req.patients
          ? `${decryptData(req.patients.first_name)} ${decryptData(req.patients.last_name)}`
          : 'Unknown';
        const isRegistered = req.status === 'registered' || req.status === 'pending';
        const statusInfo = getStatusInfo(req.status);

        return (
          <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setExpandedOrderId(null)}>
            <div className="max-w-3xl mx-4 w-full max-h-[90vh] overflow-y-auto" style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
            }} onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="px-6 py-5 border-b flex items-center justify-between sticky top-0 bg-white z-10" style={{
                borderColor: 'rgba(0,0,0,0.06)',
                borderTopLeftRadius: '12px',
                borderTopRightRadius: '12px'
              }}>
                <div>
                  <h2 className="text-xl font-bold" style={{ color: '#1F2937' }}>{patientName}</h2>
                  <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>Order Details</p>
                </div>
                <button
                  onClick={() => setExpandedOrderId(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X size={20} style={{ color: '#6B7280' }} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Patient Details */}
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wide mb-4" style={{ color: '#374151' }}>Patient Details</h4>
                    <div className="p-5 rounded-lg space-y-4 text-sm" style={{
                      background: '#F9FAFB',
                      border: '1px solid rgba(0,0,0,0.05)'
                    }}>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#6B7280' }}>Full Name</span>
                        <span className="font-bold" style={{ color: '#111827' }}>{patientName}</span>
                      </div>
                      <div className="flex justify-between items-center pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#6B7280' }}>Gender</span>
                        <span className="font-bold" style={{ color: '#111827' }}>
                          {(() => {
                            if (!req.patients?.gender) return '—';
                            try {
                              const decrypted = decryptData(req.patients.gender);
                              return decrypted || req.patients.gender || '—';
                            } catch {
                              return req.patients.gender || '—';
                            }
                          })()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#6B7280' }}>Contact</span>
                        <span className="font-bold" style={{ color: '#111827' }}>{decryptData(req.patients?.contact_number) || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#6B7280' }}>Status</span>
                        <span className="px-2 py-1 rounded text-xs font-bold" style={{
                          background: statusInfo.bg,
                          color: statusInfo.color
                        }}>
                          {statusInfo.text}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#6B7280' }}>Created</span>
                        <span className="font-bold" style={{ color: '#111827' }}>
                          {new Date(req.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tests Ordered */}
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wide mb-4" style={{ color: '#374151' }}>Tests Ordered ({req.order_tests.length})</h4>
                    <div className="rounded-lg overflow-hidden max-h-[500px] overflow-y-auto" style={{
                      background: 'white',
                      border: '1px solid rgba(0,0,0,0.06)',
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#CBD5E1 #F1F5F9'
                    }}>
                      <style jsx>{`
                        div::-webkit-scrollbar {
                          width: 6px;
                        }
                        div::-webkit-scrollbar-track {
                          background: #F1F5F9;
                          border-radius: 3px;
                        }
                        div::-webkit-scrollbar-thumb {
                          background: #CBD5E1;
                          border-radius: 3px;
                        }
                        div::-webkit-scrollbar-thumb:hover {
                          background: #94A3B8;
                        }
                      `}</style>
                      {req.order_tests.map((item) => {
                        const statusClass = item.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                          item.status === 'in_process' ? 'bg-amber-50 text-amber-700' :
                            'bg-slate-50 text-slate-500';
                        
                        return (
                          <div key={item.id} className="px-4 py-3.5 last:border-0 flex justify-between items-center" style={{
                            borderBottom: '1px solid rgba(0,0,0,0.04)'
                          }}>
                            <div>
                              <span className="font-bold block" style={{ color: '#111827' }}>{item.tests?.name}</span>
                            </div>
                            <span className={'px-3 py-1.5 rounded-lg font-bold uppercase tracking-wide ' + statusClass} style={{ fontSize: '10px' }}>
                              {item.status || 'Pending'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="mt-6 flex justify-between items-center pt-5" style={{
                  borderTop: '1px solid rgba(0,0,0,0.06)'
                }}>
                  {/* Left side buttons */}
                  <div className="flex gap-2">
                    {isRegistered && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteOrder(req.id, patientName);
                        }}
                        disabled={deletingOrderId === req.id}
                        className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:shadow-md flex items-center gap-2 disabled:opacity-50"
                        style={{
                          background: '#FEE2E2',
                          color: '#DC2626'
                        }}
                      >
                        <Trash2 size={16} />
                        {deletingOrderId === req.id ? 'Deleting...' : 'Delete Order'}
                      </button>
                    )}

                    {(req.status === 'completed' || req.status === 'delivered') && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const { generateReceipt } = await import('@/services/receiptService');
                            await generateReceipt(req.id);
                          } catch (error) {
                            console.error('Error generating receipt:', error);
                            alert('Failed to generate receipt');
                          }
                        }}
                        className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:shadow-md"
                        style={{
                          background: '#F3F4F6',
                          color: '#4B5563'
                        }}
                      >
                        Print Receipt
                      </button>
                    )}
                  </div>

                  {/* Right side buttons */}
                  <div className="flex gap-2">
                    {isRegistered && req.payment_status !== 'paid' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPaymentModalOrder(req);
                          setSelectedPaymentMethod(null);
                        }}
                        className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:shadow-md flex items-center gap-2"
                        style={{
                          background: '#2563EB',
                          color: 'white'
                        }}
                      >
                        <CreditCard size={16} />
                        Payment Method
                      </button>
                    )}

                    {isRegistered && req.payment_status === 'paid' && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const { generateReceipt } = await import('@/services/receiptService');
                            await generateReceipt(req.id);
                          } catch (error) {
                            console.error('Error generating receipt:', error);
                            alert('Failed to generate receipt');
                          }
                        }}
                        className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:shadow-md flex items-center gap-2"
                        style={{
                          background: '#16A34A',
                          color: 'white'
                        }}
                      >
                        <FileText size={16} />
                        Payment Receipt
                      </button>
                    )}

                    {(req.status === 'sample_collected' || req.status === 'in_process') && (
                      <a href="/dashboard/results" className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:shadow-md flex items-center" style={{
                        background: '#8B5CF6',
                        color: 'white'
                      }}>
                        Enter Results
                      </a>
                    )}

                    {req.status === 'pending_approval' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApproveReport(req.id, patientName);
                        }}
                        disabled={approvingOrderId === req.id}
                        className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          background: '#16A34A',
                          color: 'white'
                        }}
                      >
                        {approvingOrderId === req.id ? 'Approving...' : 'Approve Report'}
                      </button>
                    )}

                    {(req.status === 'completed' || req.status === 'delivered') && (
                      <DownloadReportBtn orderId={req.id} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Custom Confirmation Dialog */}
      {confirmDelete && (
          <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="max-w-md mx-4" style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              padding: '24px'
            }}>
              <h3 className="text-lg font-bold mb-2" style={{ color: '#1F2937' }}>Confirm Deletion</h3>
              <p className="mb-4" style={{ color: '#6B7280' }}>
                Are you sure you want to delete the order for <strong>{confirmDelete.patientName}</strong>?
                <br /><br />
                This will permanently delete the order and all associated test results.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteOrder}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition font-semibold flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Delete Order
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Approval Confirmation Dialog */}
      {
        confirmApprove && (
          <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="max-w-md mx-4" style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              padding: '24px'
            }}>
              <h3 className="text-lg font-bold mb-2" style={{ color: '#1F2937' }}>Approve Report</h3>
              <p className="mb-4" style={{ color: '#6B7280' }}>
                Are you sure you want to approve the report for <strong>{confirmApprove.patientName}</strong>?
                <br /><br />
                This will mark the report as completed and ready for delivery to the patient.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmApprove(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmApproveReport}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition font-semibold flex items-center gap-2"
                >
                  <CheckCircle size={16} />
                  Approve Report
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Notification Toast */}
      {
        notification && (
          <div className="fixed top-4 right-4 z-50 animate-slide-in">
            <div className={'rounded-lg shadow-xl p-4 max-w-md flex items-start gap-3 ' + (notification.type === 'success'
              ? 'bg-green-50 border-2 border-green-500'
              : 'bg-red-50 border-2 border-red-500')}>
              <div className={'shrink-0 ' + (notification.type === 'success' ? 'text-green-600' : 'text-red-600')}>
                {notification.type === 'success' ? (
                  <CheckCircle size={24} />
                ) : (
                  <AlertCircle size={24} />
                )}
              </div>
              <div className="flex-1">
                <p className={'font-semibold text-sm ' + (notification.type === 'success' ? 'text-green-900' : 'text-red-900')}>
                  {notification.type === 'success' ? 'Success!' : 'Error'}
                </p>
                <p className={'text-sm mt-1 ' + (notification.type === 'success' ? 'text-green-700' : 'text-red-700')}>
                  {notification.message}
                </p>
              </div>
              <button
                onClick={() => setNotification(null)}
                className={'shrink-0 ' + (notification.type === 'success' ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800')}
              >
                ✕
              </button>
            </div>
          </div>
        )
      }

      {/* Payment Method Modal */}
      {paymentModalOrder && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="max-w-md mx-4 w-full" style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            padding: '24px'
          }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold" style={{ color: '#1F2937' }}>Payment Method</h3>
              <button
                onClick={() => {
                  setPaymentModalOrder(null);
                  setSelectedPaymentMethod(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6">
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 text-sm">Total Amount</span>
                  <span className="text-2xl font-bold text-slate-900">₹{paymentModalOrder.total_amount || 0}</span>
                </div>
              </div>

              <p className="text-sm text-slate-600 mb-3">Select payment method:</p>

              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setSelectedPaymentMethod('UPI')}
                  className={'p-4 rounded-lg border-2 transition flex flex-col items-center gap-2 ' + (selectedPaymentMethod === 'UPI'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 hover:border-blue-300')}
                >
                  <Smartphone size={24} className={selectedPaymentMethod === 'UPI' ? 'text-blue-600' : 'text-slate-600'} />
                  <span className={'text-sm font-semibold ' + (selectedPaymentMethod === 'UPI' ? 'text-blue-600' : 'text-slate-700')}>
                    UPI
                  </span>
                </button>

                <button
                  onClick={() => setSelectedPaymentMethod('Cash')}
                  className={'p-4 rounded-lg border-2 transition flex flex-col items-center gap-2 ' + (selectedPaymentMethod === 'Cash'
                      ? 'border-green-600 bg-green-50'
                      : 'border-slate-200 hover:border-green-300')}
                >
                  <Banknote size={24} className={selectedPaymentMethod === 'Cash' ? 'text-green-600' : 'text-slate-600'} />
                  <span className={'text-sm font-semibold ' + (selectedPaymentMethod === 'Cash' ? 'text-green-600' : 'text-slate-700')}>
                    Cash
                  </span>
                </button>

                <button
                  onClick={() => setSelectedPaymentMethod('Card')}
                  className={'p-4 rounded-lg border-2 transition flex flex-col items-center gap-2 ' + (selectedPaymentMethod === 'Card'
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-slate-200 hover:border-purple-300')}
                >
                  <CreditCard size={24} className={selectedPaymentMethod === 'Card' ? 'text-purple-600' : 'text-slate-600'} />
                  <span className={'text-sm font-semibold ' + (selectedPaymentMethod === 'Card' ? 'text-purple-600' : 'text-slate-700')}>
                    Card
                  </span>
                </button>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setPaymentModalOrder(null);
                  setSelectedPaymentMethod(null);
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessPayment}
                disabled={!selectedPaymentMethod || processingPayment}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle size={16} />
                {processingPayment ? 'Processing...' : 'Payment Done'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div >
  );
}