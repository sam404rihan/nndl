"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { decryptData } from '@/lib/crypto';
import { getHoursPending } from '@/lib/tat';
import DownloadReportBtn from '@/components/DownloadReportBtn';
import { Clock, CheckCircle, AlertCircle, FileText, ChevronDown, ChevronUp, User, Phone, Calendar, Trash2, CreditCard, Banknote, Smartphone, X } from 'lucide-react';

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
        console.error('Error fetching orders:', JSON.stringify(error, null, 2));
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

  const toggleExpand = (id: string) => {
    setExpandedOrderId(prev => prev === id ? null : id);
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

  if (loading) return <div className="p-8 text-slate-500">Loading test requests...</div>;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Test Requests</h2>
        <p className="text-slate-500 mt-1">Manage and track all laboratory test orders</p>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-xl">
          <h3 className="text-lg font-medium text-slate-600">No requests found</h3>
          <p className="text-slate-400">Create a new order to get started.</p>
        </div>
      ) : (
        <div
          className="space-y-6 overflow-y-auto pr-2"
          style={{
            maxHeight: 'calc(3 * 200px + 3 * 1.5rem)',
          }}
        >
          <style jsx>{`
            div::-webkit-scrollbar {
              width: 8px;
            }
            div::-webkit-scrollbar-track {
              background: #f1f5f9;
              border-radius: 4px;
            }
            div::-webkit-scrollbar-thumb {
              background: #cbd5e1;
              border-radius: 4px;
            }
            div::-webkit-scrollbar-thumb:hover {
              background: #94a3b8;
            }
          `}</style>
          {requests.map((req) => {
            const isExpanded = expandedOrderId === req.id;
            const overdue = isOverdue(req.created_at);
            const patientName = req.patients
              ? `${decryptData(req.patients.first_name)} ${decryptData(req.patients.last_name)}`
              : 'Unknown';
            const isRegistered = req.status === 'registered' || req.status === 'pending';

            return (
              <div key={req.id} className={`bg-white rounded-xl shadow-sm border transition-all ${isExpanded ? 'ring-2 ring-blue-500 border-transparent z-10' : 'border-slate-200 hover:border-blue-300'}`}>
                {/* Card Header */}
                <div
                  className="p-6 cursor-pointer"
                  onClick={() => toggleExpand(req.id)}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-full ${overdue ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                        <User size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">{patientName}</h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${getStatusColor(req.status)}`}>
                        {getStatusDisplay(req.status)}
                      </div>
                      {isExpanded ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                    </div>
                  </div>

                  {!isExpanded && (
                    <div className="mt-4 pl-[60px] flex flex-wrap gap-2">
                      {req.order_tests.slice(0, 3).map((item, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-1 rounded bg-slate-50 text-slate-600 text-xs border border-slate-100">
                          {item.tests?.name}
                        </span>
                      ))}
                      {req.order_tests.length > 3 && (
                        <span className="text-xs text-slate-400 flex items-center">+{req.order_tests.length - 3} more</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-6 rounded-b-xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Patient Details */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Patient Details</h4>
                        <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Full Name</span>
                            <span className="font-medium text-slate-900">{patientName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Gender</span>
                            <span className="font-medium text-slate-900">
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
                          <div className="flex justify-between">
                            <span className="text-slate-500">Contact</span>
                            <span className="font-medium text-slate-900">{decryptData(req.patients?.contact_number) || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Registered</span>
                            <span className="font-medium text-slate-900">
                              {new Date(req.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Tests Ordered */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Tests Ordered ({req.order_tests.length})</h4>
                        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                          {req.order_tests.map((item) => (
                            <div key={item.id} className="px-4 py-3 border-b border-slate-50 last:border-0 flex justify-between items-center text-sm">
                              <div>
                                <span className="font-medium text-slate-800 block">{item.tests?.name}</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${item.status === 'completed' ? 'bg-green-100 text-green-700' :
                                item.status === 'in_process' ? 'bg-yellow-50 text-yellow-700' :
                                  'bg-slate-100 text-slate-400'
                                }`}>
                                {item.status || 'Pending'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="mt-6 flex justify-between items-center pt-4 border-t border-slate-200">
                      {/* Left side buttons */}
                      <div>
                        {isRegistered && (
                          <button
                            onClick={(e) => {
                              console.log('Delete button clicked!', req.id);
                              e.stopPropagation();
                              handleDeleteOrder(req.id, patientName);
                            }}
                            disabled={deletingOrderId === req.id}
                            className="px-3 py-2 bg-red-50 text-red-600 text-sm font-semibold rounded hover:bg-red-100 transition flex items-center gap-2 disabled:opacity-50"
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
                            className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-semibold rounded hover:bg-slate-200 transition"
                          >
                            Print Receipt
                          </button>
                        )}
                      </div>

                      {/* Right side buttons */}
                      <div className="flex gap-3">
                        {isRegistered && req.payment_status !== 'paid' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPaymentModalOrder(req);
                              setSelectedPaymentMethod(null);
                            }}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 transition flex items-center gap-2"
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
                            className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded hover:bg-green-700 transition flex items-center gap-2"
                          >
                            <FileText size={16} />
                            Payment Receipt
                          </button>
                        )}

                        {(req.status === 'sample_collected' || req.status === 'in_process') && (
                          <a href="/dashboard/results" className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded hover:bg-purple-700 transition">
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
                            className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                )
                }
              </div>
            );
          })}
        </div>
      )
      }

      {/* Custom Confirmation Dialog */}
      {
        confirmDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md mx-4">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Confirm Deletion</h3>
              <p className="text-slate-600 mb-4">
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md mx-4">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Approve Report</h3>
              <p className="text-slate-600 mb-4">
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
            <div className={`rounded-lg shadow-xl p-4 max-w-md flex items-start gap-3 ${notification.type === 'success'
              ? 'bg-green-50 border-2 border-green-500'
              : 'bg-red-50 border-2 border-red-500'
              }`}>
              <div className={`shrink-0 ${notification.type === 'success' ? 'text-green-600' : 'text-red-600'
                }`}>
                {notification.type === 'success' ? (
                  <CheckCircle size={24} />
                ) : (
                  <AlertCircle size={24} />
                )}
              </div>
              <div className="flex-1">
                <p className={`font-semibold text-sm ${notification.type === 'success' ? 'text-green-900' : 'text-red-900'
                  }`}>
                  {notification.type === 'success' ? 'Success!' : 'Error'}
                </p>
                <p className={`text-sm mt-1 ${notification.type === 'success' ? 'text-green-700' : 'text-red-700'
                  }`}>
                  {notification.message}
                </p>
              </div>
              <button
                onClick={() => setNotification(null)}
                className={`shrink-0 ${notification.type === 'success' ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'
                  }`}
              >
                ✕
              </button>
            </div>
          </div>
        )
      }

      {/* Payment Method Modal */}
      {paymentModalOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md mx-4 w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Payment Method</h3>
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
                  className={`p-4 rounded-lg border-2 transition flex flex-col items-center gap-2 ${selectedPaymentMethod === 'UPI'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 hover:border-blue-300'
                    }`}
                >
                  <Smartphone size={24} className={selectedPaymentMethod === 'UPI' ? 'text-blue-600' : 'text-slate-600'} />
                  <span className={`text-sm font-semibold ${selectedPaymentMethod === 'UPI' ? 'text-blue-600' : 'text-slate-700'}`}>
                    UPI
                  </span>
                </button>

                <button
                  onClick={() => setSelectedPaymentMethod('Cash')}
                  className={`p-4 rounded-lg border-2 transition flex flex-col items-center gap-2 ${selectedPaymentMethod === 'Cash'
                      ? 'border-green-600 bg-green-50'
                      : 'border-slate-200 hover:border-green-300'
                    }`}
                >
                  <Banknote size={24} className={selectedPaymentMethod === 'Cash' ? 'text-green-600' : 'text-slate-600'} />
                  <span className={`text-sm font-semibold ${selectedPaymentMethod === 'Cash' ? 'text-green-600' : 'text-slate-700'}`}>
                    Cash
                  </span>
                </button>

                <button
                  onClick={() => setSelectedPaymentMethod('Card')}
                  className={`p-4 rounded-lg border-2 transition flex flex-col items-center gap-2 ${selectedPaymentMethod === 'Card'
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-slate-200 hover:border-purple-300'
                    }`}
                >
                  <CreditCard size={24} className={selectedPaymentMethod === 'Card' ? 'text-purple-600' : 'text-slate-600'} />
                  <span className={`text-sm font-semibold ${selectedPaymentMethod === 'Card' ? 'text-purple-600' : 'text-slate-700'}`}>
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