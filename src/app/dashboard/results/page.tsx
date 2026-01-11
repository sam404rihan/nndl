"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { analyzeResult, getFlagColor, ResultFlag } from '@/lib/validation';
import { decryptData } from '@/lib/crypto';
import { Save, Send, AlertCircle, CheckCircle, Clock, Search, FileBarChart, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';

// --- Types ---
interface ResultItem {
  result_id: string;
  test_name: string;
  units: string;
  reference_range: string;
  result_value: string;
  flag: ResultFlag;
  status: string;
}

interface OrderGroup {
  order_id: string;
  patient_name: string;
  patient_id: string; // using first_name/last_name from view, but arguably we might want a real ID or hash
  mrn: string;
  order_created_at: string;
  items: ResultItem[];
}

export default function ResultEntry() {
  const [orders, setOrders] = useState<OrderGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const toggleOrder = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  // Load pending work
  useEffect(() => {
    fetchWorklist();
  }, []);

  const fetchWorklist = async () => {
    setLoading(true);
    
    // Query orders where payment is paid and get nested test results
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        created_at,
        payment_status,
        patients (
          first_name,
          last_name
        ),
        order_tests (
          id,
          tests (
            name
          ),
          test_results (
            id,
            result_value,
            unit,
            reference_range,
            flag,
            status
          )
        )
      `)
      .eq('payment_status', 'paid');

    if (ordersError) {
      console.error('Error fetching results:', ordersError);
      setLoading(false);
      return;
    }

    if (!ordersData || ordersData.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      const grouped: OrderGroup[] = [];
      
      for (const order of ordersData) {
        const items: ResultItem[] = [];
        const orderData = order as any;
        
        for (const orderTest of (orderData.order_tests || [])) {
          // test_results is an object (one-to-one relationship)
          const testResult = orderTest.test_results as any;
          const test = orderTest.tests as any;
          
          if (testResult && testResult.status !== 'validated') {
            items.push({
              result_id: testResult.id,
              test_name: test?.name || '',
              units: testResult.unit || '',
              reference_range: testResult.reference_range || '',
              result_value: testResult.result_value || '',
              flag: (testResult.flag as ResultFlag) || 'N',
              status: testResult.status
            });
          }
        }
        
        if (items.length > 0) {
          grouped.push({
            order_id: orderData.id,
            patient_name: `${decryptData(orderData.patients.first_name)} ${decryptData(orderData.patients.last_name)}`,
            mrn: '',
            patient_id: orderData.patients.first_name,
            order_created_at: orderData.created_at,
            items
          });
        }
      }

      setOrders(grouped);
    } catch (processError) {
      console.error('Error processing results:', processError);
    }
    
    setLoading(false);
  };

  // Handle Input Change
  const handleResultChange = (orderId: string, resultId: string, val: string) => {
    setOrders(prev => prev.map(order => {
      if (order.order_id !== orderId) return order;
      return {
        ...order,
        items: order.items.map(item => {
          if (item.result_id !== resultId) return item;
          return {
            ...item,
            result_value: val,
            flag: analyzeResult(val, item.reference_range)
          };
        })
      };
    }));
  };

  // Save Draft (Batch for Order)
  const saveDraft = async (order: OrderGroup) => {
    setSavingId(order.order_id);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updates = order.items.map(item => ({
        result_id: item.result_id,
        result_value: item.result_value,
        flag: item.flag,
        status: 'draft'
      }));

      const results = await Promise.all(updates.map(async (u) => {
        return supabase
          .from('test_results')
          .update({
            result_value: u.result_value,
            flag: u.flag,
            status: 'draft',
            entered_by: user?.id,
            entered_at: new Date().toISOString()
          })
          .eq('id', u.result_id);
      }));

      // Check for errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error('Save errors:', errors);
        setNotification({ type: 'error', message: `Failed to save ${errors.length} results. Please try again.` });
        setTimeout(() => setNotification(null), 5000);
        setSavingId(null);
        return;
      }

      setNotification({ type: 'success', message: `Draft saved for ${order.patient_name}` });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Save draft error:', error);
      setNotification({ type: 'error', message: 'Failed to save draft. Please try again.' });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setSavingId(null);
    }
  };

  // Submit for Approval (Batch for Order)
  const submitOrder = async (order: OrderGroup) => {
    // Basic validation: Check if all items have values
    const emptyItems = order.items.filter(i => !i.result_value.trim());
    if (emptyItems.length > 0) {
      if (!confirm(`You have ${emptyItems.length} empty results. Submit anyway?`)) return;
    }

    setSavingId(order.order_id);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updates = order.items.map(item => ({
        result_id: item.result_id,
        result_value: item.result_value,
        flag: item.flag,
      }));

      const results = await Promise.all(updates.map(async (u) => {
        return supabase
          .from('test_results')
          .update({
            result_value: u.result_value,
            flag: u.flag,
            status: 'validated',
            validated_by: user?.id,
            validated_at: new Date().toISOString()
          })
          .eq('id', u.result_id);
      }));

      // Check for errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error('Submit errors:', errors);
        setNotification({ type: 'error', message: `Failed to submit ${errors.length} results. Please try again.` });
        setTimeout(() => setNotification(null), 5000);
        setSavingId(null);
        return;
      }

      // Only remove from UI if all succeeded
      setOrders(prev => prev.filter(o => o.order_id !== order.order_id));
      setNotification({ type: 'success', message: `Results submitted for ${order.patient_name}` });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Submit error:', error);
      setNotification({ type: 'error', message: 'Failed to submit results. Please try again.' });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8F9FB' }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 mx-auto mb-4" style={{
          borderColor: 'rgba(74, 111, 165, 0.2)',
          borderTopColor: '#4A6FA5'
        }}></div>
        <p style={{ color: '#6B7280' }}>Loading pending results...</p>
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
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center" style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                background: '#DBEAFE',
                color: '#2563EB'
              }}>
                <FileBarChart size={22} strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#1F2937' }}>
                  Result Entry
                </h1>
                <p className="mt-1 text-sm font-medium" style={{ color: '#6B7280' }}>
                  Review, enter values, and submit for validation
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ 
              background: '#FEF3C7',
              border: '1px solid #F59E0B'
            }}>
              <span className="text-sm font-bold" style={{ color: '#F59E0B' }}>{orders.length} Pending</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="relative">
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter by patient name or MRN..."
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

      <div className="max-w-6xl mx-auto px-6 py-6">
        {orders.filter(order => {
          if (!filterQuery) return true;
          const query = filterQuery.toLowerCase();
          return (
            order.patient_name.toLowerCase().includes(query) ||
            order.mrn.toLowerCase().includes(query)
          );
        }).length === 0 ? (
          <div className="text-center py-20 rounded-xl" style={{
          background: 'white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          border: '1px dashed rgba(0,0,0,0.1)'
        }}>
          <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#E5E7EB' }} />
          <h3 className="text-lg font-semibold mb-1" style={{ color: '#6B7280' }}>
            {filterQuery ? 'No matching orders found' : 'All caught up!'}
          </h3>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>
            {filterQuery ? 'Try a different search term' : 'No pending orders to process'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.filter(order => {
            if (!filterQuery) return true;
            const query = filterQuery.toLowerCase();
            return (
              order.patient_name.toLowerCase().includes(query) ||
              order.mrn.toLowerCase().includes(query)
            );
          }).map(order => (
            <div key={order.order_id} className="overflow-hidden" style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              border: '1px solid rgba(0,0,0,0.05)'
            }}>
              {/* Card Header */}
              <div 
                className="px-6 py-4 border-b cursor-pointer transition-all hover:bg-slate-50/50" 
                style={{
                  background: 'linear-gradient(to right, #F9FAFB 0%, #F3F4F6 100%)',
                  borderColor: 'rgba(0,0,0,0.06)'
                }}
                onClick={() => toggleOrder(order.order_id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg transition-all" style={{
                      background: expandedOrders.has(order.order_id) ? '#DBEAFE' : '#F3F4F6',
                      color: expandedOrders.has(order.order_id) ? '#2563EB' : '#6B7280'
                    }}>
                      {expandedOrders.has(order.order_id) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold" style={{ color: '#111827' }}>{order.patient_name}</h3>
                      <div className="flex items-center gap-3 text-xs mt-1 font-semibold" style={{ color: '#6B7280' }}>
                        <span className="flex items-center gap-1">
                          ID: <span className="font-mono">{order.order_id.slice(0, 8).toUpperCase()}</span>
                        </span>
                        <span style={{ color: '#D1D5DB' }}>•</span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(order.order_created_at).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          }).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{
                    background: '#DBEAFE',
                    color: '#1E40AF'
                  }}>
                    {order.items.length} {order.items.length === 1 ? 'Test' : 'Tests'}
                  </div>
                </div>
              </div>

              {/* Card Body - Test List */}
              {expandedOrders.has(order.order_id) && (
              <>
              <div className="p-6" style={{ background: '#FAFBFC' }}>
                <div className="space-y-4">
                {order.items.map((item, idx) => (
                  <div key={item.result_id} className="p-4 rounded-lg transition-all hover:shadow-sm" style={{
                    background: 'white',
                    border: '1px solid rgba(0,0,0,0.06)'
                  }}>
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Test Name */}
                      <div className="lg:flex-1">
                        <p className="font-bold text-base mb-1" style={{ color: '#111827' }}>{item.test_name}</p>
                        <p className="text-xs font-medium" style={{ color: '#9CA3AF' }}>
                          <span style={{ color: '#6B7280' }}>Range:</span> {item.reference_range || 'Not specified'}
                        </p>
                      </div>

                      {/* Input Area */}
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <input
                            type="text"
                            value={item.result_value}
                            onChange={(e) => handleResultChange(order.order_id, item.result_id, e.target.value)}
                            placeholder="Enter value"
                            className="px-4 py-2.5 border-2 rounded-lg font-mono font-semibold focus:outline-none transition-all w-36"
                            style={{
                              borderColor: item.flag === 'H' ? '#F59E0B' : item.flag === 'L' ? '#EAB308' : item.result_value ? '#2563EB' : '#E5E7EB',
                              background: item.flag === 'H' ? '#FFFBEB' : item.flag === 'L' ? '#FEFCE8' : 'white',
                              color: item.flag === 'H' ? '#D97706' : item.flag === 'L' ? '#CA8A04' : '#111827'
                            }}
                          />
                          {item.units && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold pointer-events-none" style={{ color: '#9CA3AF' }}>
                              {item.units}
                            </span>
                          )}
                        </div>

                        {/* Visual Flag */}
                        {item.flag !== 'N' && (
                          <div className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase flex items-center gap-1.5" style={{
                            background: item.flag === 'H' ? '#FEF3C7' : '#FEF9C3',
                            color: item.flag === 'H' ? '#D97706' : '#CA8A04',
                            border: `1px solid ${item.flag === 'H' ? '#FCD34D' : '#FDE047'}`
                          }}>
                            <AlertCircle size={12} />
                            {item.flag === 'H' ? 'High' : 'Low'}
                          </div>
                        )}

                        {/* Status Badge */}
                        {item.status === 'draft' && (
                          <div className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{
                            background: '#F3F4F6',
                            color: '#6B7280'
                          }}>
                            Draft
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              </div>

              {/* Card Footer - Action Buttons */}
              <div className="px-6 py-4 flex justify-end gap-3" style={{
                background: 'white',
                borderTop: '1px solid rgba(0,0,0,0.06)'
              }}>
                <button
                  onClick={() => saveDraft(order)}
                  disabled={savingId === order.order_id}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition disabled:opacity-50 hover:shadow-md"
                  style={{
                    background: 'white',
                    border: '1.5px solid #E5E7EB',
                    color: '#4B5563'
                  }}
                >
                  <Save size={16} />
                  Save Draft
                </button>
                <button
                  onClick={() => submitOrder(order)}
                  disabled={savingId === order.order_id}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold transition hover:shadow-md disabled:opacity-50"
                  style={{
                    background: '#6366F1',
                    color: 'white'
                  }}
                >
                  {savingId === order.order_id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Submit for Approval
                    </>
                  )}
                </button>
              </div>
              </>
              )}
            </div>
          ))}
        </div>
      )}

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
      </div>
    </div>
  );
}