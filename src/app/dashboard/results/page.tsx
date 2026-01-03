"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { analyzeResult, getFlagColor, ResultFlag } from '@/lib/validation';
import { decryptData } from '@/lib/crypto';
import { Save, Send, AlertCircle, CheckCircle, Clock } from 'lucide-react';

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
  order_created_at: string;
  items: ResultItem[];
}

export default function ResultEntry() {
  const [orders, setOrders] = useState<OrderGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Load pending work
  useEffect(() => {
    fetchWorklist();
  }, []);

  const fetchWorklist = async () => {
    setLoading(true);
    // Fetch flat data
    const { data, error } = await supabase
      .from('pending_results_view')
      .select('*')
      .neq('result_status', 'validated'); // Hide already submitted/validated items from this queue

    if (!error && data) {
      // 1. Process & Decrypt Flat Data
      const flatItems = data.map((d: any) => ({
        result_id: d.result_id,
        order_id: d.order_id,
        patient_name: `${decryptData(d.first_name)} ${decryptData(d.last_name)}`,
        // We assume 'p.id' isn't in the view explicitly based on previous file, but 'first_name' is. 
        // If we need patient ID, we might need to update view, but for now we group by order_id.
        order_created_at: d.order_created_at,
        test_name: d.test_name,
        units: d.unit || '',
        reference_range: d.reference_range || '',
        result_value: d.result_value || '',
        flag: (d.flag as ResultFlag) || 'N',
        status: d.result_status
      }));

      // 2. Group by Order ID
      const grouped = Object.values(flatItems.reduce((acc: any, item: any) => {
        if (!acc[item.order_id]) {
          acc[item.order_id] = {
            order_id: item.order_id,
            patient_name: item.patient_name,
            order_created_at: item.order_created_at,
            items: []
          };
        }
        acc[item.order_id].items.push({
          result_id: item.result_id,
          test_name: item.test_name,
          units: item.units,
          reference_range: item.reference_range,
          result_value: item.result_value,
          flag: item.flag,
          status: item.status
        });
        return acc;
      }, {})) as OrderGroup[];

      setOrders(grouped);
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
    const updates = order.items.map(item => ({
      result_id: item.result_id,
      result_value: item.result_value,
      flag: item.flag,
      status: 'draft'
    }));

    // Process all updates in parallel (or use a stored procedure if stricter atomic)
    // For now, simple loop is fine for small batches
    await Promise.all(updates.map(async (u) => {
      const { data: { user } } = await supabase.auth.getUser();
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

    setSavingId(null);
    alert("Draft saved successfully for " + order.patient_name);
  };

  // Submit for Approval (Batch for Order)
  const submitOrder = async (order: OrderGroup) => {
    // Basic validation: Check if all items have values? 
    // For now, allow submit even if partial, but ideally warn.
    const emptyItems = order.items.filter(i => !i.result_value.trim());
    if (emptyItems.length > 0) {
      if (!confirm(`You have ${emptyItems.length} empty results. Submit anyway?`)) return;
    }

    setSavingId(order.order_id);
    const updates = order.items.map(item => ({
      result_id: item.result_id,
      result_value: item.result_value,
      flag: item.flag,
    }));

    await Promise.all(updates.map(async (u) => {
      const { data: { user } } = await supabase.auth.getUser();
      return supabase
        .from('test_results')
        .update({
          result_value: u.result_value,
          flag: u.flag,
          status: 'validated', // Moving to 'validated' (or pending_approval)
          validated_by: user?.id,
          validated_at: new Date().toISOString()
        })
        .eq('id', u.result_id);
    }));

    setSavingId(null);
    // Remove order from local list
    setOrders(prev => prev.filter(o => o.order_id !== order.order_id));
  };

  if (loading) return <div className="p-8 text-slate-500">Loading pending results...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pending Result Entry</h1>
          <p className="text-slate-500 text-sm mt-1">Review, enter values, and submit for validation.</p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-semibold">
          {orders.length} Pending Orders
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-slate-200">
          <CheckCircle className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-600">All caught up!</h3>
          <p className="text-slate-400">No pending orders to process.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map(order => (
            <div key={order.order_id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Card Header */}
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-wrap justify-between items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{order.patient_name}</h3>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 uppercase tracking-wide font-semibold">
                    <span className="flex items-center gap-1">
                      ID: <span className="font-mono">{order.order_id.slice(0, 8).toUpperCase()}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(order.order_created_at).toLocaleString('en-IN', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
                {/* Header Actions/Status could go here */}
              </div>

              {/* Card Body - Test List */}
              <div className="divide-y divide-slate-100">
                {order.items.map((item) => (
                  <div key={item.result_id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-slate-50/50 transition-colors">
                    {/* Test Name */}
                    <div className="sm:w-1/3">
                      <p className="font-semibold text-slate-700">{item.test_name}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        Range: {item.reference_range} {item.units}
                      </p>
                    </div>

                    {/* Input Area */}
                    <div className="sm:w-1/3 flex items-center gap-3">
                      <div className="relative flex-1 max-w-[140px]">
                        <input
                          type="text"
                          value={item.result_value}
                          onChange={(e) => handleResultChange(order.order_id, item.result_id, e.target.value)}
                          placeholder="Value"
                          className={`w-full px-3 py-2 border-2 rounded-lg font-mono font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all
                            ${item.flag === 'H' ? 'border-orange-300 focus:ring-orange-200 text-orange-700 bg-orange-50' :
                              item.flag === 'L' ? 'border-yellow-300 focus:ring-yellow-200 text-yellow-700 bg-yellow-50' :
                                'border-slate-200 focus:border-blue-500 focus:ring-blue-100'}`}
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium pointer-events-none">
                          {item.units}
                        </span>
                      </div>

                      {/* Visual Flag */}
                      {item.flag !== 'N' && (
                        <div className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider
                          ${item.flag === 'H' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {item.flag === 'H' ? 'High' : 'Low'}
                        </div>
                      )}
                    </div>

                    {/* Status/Feedback */}
                    <div className="sm:w-1/3 text-right">
                      {item.status === 'draft' && <span className="text-xs font-medium text-slate-400 italic">Draft Saved</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Card Footer - Actions */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button
                  onClick={() => saveDraft(order)}
                  disabled={savingId === order.order_id}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-800 transition disabled:opacity-50"
                >
                  <Save size={16} />
                  Save Draft
                </button>
                <button
                  onClick={() => submitOrder(order)}
                  disabled={savingId === order.order_id}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 rounded-lg text-white font-semibold shadow-sm hover:bg-blue-700 hover:shadow-md transition transform active:scale-95 disabled:opacity-50"
                >
                  {savingId === order.order_id ? 'Processing...' : (
                    <>
                      <Send size={16} />
                      Submit for Approval
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}