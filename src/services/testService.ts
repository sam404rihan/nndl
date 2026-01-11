import { supabase } from '@/lib/supabase';

export interface TestItem {
  id?: string;
  name: string;
  code: string;
  price: number;
  units: string;
  reference_range: string;
  // Optional fields - only if they exist in your schema
  department?: string;
  sample_type?: string;
  is_active?: boolean;
  ref_range_notes?: string;
}

// Helper function to create audit log
const createAuditLog = async (action: 'CREATE' | 'UPDATE' | 'DELETE', recordId: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await supabase.from('audit_logs').insert({
        action,
        table_name: 'tests',
        record_id: recordId,
        user_id: user.id,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw - audit logging shouldn't break the main operation
  }
};

export const getTests = async () => {
  const { data, error } = await supabase
    .from('tests')
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
};

export const getActiveTests = async () => {
  const { data, error } = await supabase
    .from('tests')
    .select('*')
    .order('name');
  if (error) throw error;
  // Filter active tests client-side if is_active column doesn't exist
  return data?.filter((t: any) => t.is_active !== false) || data;
};

export const addTest = async (test: Omit<TestItem, 'id'>) => {
  const { data, error } = await supabase
    .from('tests')
    .insert(test)
    .select()
    .single();

  if (error) throw error;

  // Create audit log
  if (data?.id) {
    await createAuditLog('CREATE', data.id);
  }

  return data;
};

export const updateTest = async (id: string, updates: Partial<TestItem>) => {
  const { error } = await supabase
    .from('tests')
    .update(updates)
    .eq('id', id);

  if (error) throw error;

  // Create audit log
  await createAuditLog('UPDATE', id);
};

export const toggleTestStatus = async (id: string, isActive: boolean) => {
  const { error } = await supabase
    .from('tests')
    .update({ is_active: isActive })
    .eq('id', id);

  if (error) throw error;

  // Create audit log
  await createAuditLog('UPDATE', id);
};

export const deleteTest = async (id: string) => {
  const { error } = await supabase
    .from('tests')
    .delete()
    .eq('id', id);

  if (error) throw error;

  // Create audit log
  await createAuditLog('DELETE', id);
};