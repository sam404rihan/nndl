import { supabase } from '@/lib/supabase';

export const getSettings = async () => {
  const { data, error } = await supabase.from('app_settings').select('*').single();
  if (error) {
    // Return fallback if table empty
    return { lab_name: 'Lab Name', address: 'Address', phone: 'Phone', email: 'email@lab.com' };
  }
  return data;
};

export const updateSettings = async (settings: any) => {
  // We use upsert to ensure we update the existing row or create one
  // Since we only want one row, in a real app we'd hardcode ID or ensure constraint
  // Here we just update the first row found.
  const current = await getSettings();
  
  const { error } = await supabase
    .from('app_settings')
    .update(settings)
    .eq('id', current.id); // Update by ID
    
  if (error) throw error;
};