import { supabase } from '@/lib/supabase';
import { createAuditLog } from '@/lib/auditLog';

export const createOrder = async (patientId: string, testIds: string[], total: number) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // 1. Create Order Header
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      patient_id: patientId,
      total_amount: total,
      created_by: user.id,
      payment_status: 'pending'
    })
    .select()
    .single();

  if (orderError) throw orderError;

  // 2. Create Order Items
  const items = testIds.map(testId => ({
    order_id: order.id,
    test_id: testId
  }));

  const { error: itemsError } = await supabase.from('order_tests').insert(items);
  if (itemsError) throw itemsError;

  // 3. Audit Log - HIPAA Requirement
  await createAuditLog('CREATE', 'orders', order.id, {
    patient_id: patientId,
    test_count: testIds.length,
    items: testIds
  });

  return order;
};

export const updateOrder = async (orderId: string, updates: any) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId);

  if (error) throw error;

  // Audit Log
  await createAuditLog('UPDATE', 'orders', orderId);
};

export const cancelOrder = async (orderId: string, reason?: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id
    })
    .eq('id', orderId);

  if (error) throw error;

  // Audit Log - include reason in metadata but not PHI
  await createAuditLog('CANCEL', 'orders', orderId, {
    ...(reason && { reason })
  });
};

export const addTestToOrder = async (orderId: string, testId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('order_tests')
    .insert({
      order_id: orderId,
      test_id: testId
    });

  if (error) throw error;

  // Audit Log
  await createAuditLog('UPDATE', 'orders', orderId, {
    action_detail: 'test_added'
  });
};

export const removeTestFromOrder = async (orderId: string, testId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('order_tests')
    .delete()
    .eq('order_id', orderId)
    .eq('test_id', testId);

  if (error) throw error;

  // Audit Log
  await createAuditLog('UPDATE', 'orders', orderId, {
    action_detail: 'test_removed'
  });
};