import { supabase } from '@/lib/supabase';
import { createAuditLog } from '@/lib/auditLog';

export interface TestResult {
    test_request_id: string;
    test_id: string;
    result_value: string;
    unit: string;
    reference_range: string;
    status: 'pending' | 'in_progress' | 'completed';
}

export const enterResults = async (testRequestId: string, results: TestResult[]) => {
    // STRICT PATTERN: We do not create results manually anymore.
    // The system creates empty "Shells" when the order is processed.
    // Lab staff only UPDATE those shells.
    throw new Error('Deprecated: Use updateResults to enter values into existing result shells.');
};

export const updateResults = async (resultId: string, updates: Partial<TestResult>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('test_results')
        .update({
            ...updates,
            edited_by: user.id,
            edited_at: new Date().toISOString()
        })
        .eq('id', resultId);

    if (error) throw error;

    // Audit Log - Do NOT include result values
    await createAuditLog('UPDATE', 'test_results', resultId);
};

export const finalizeResults = async (resultId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('test_results')
        .update({
            status: 'completed',
            finalized_by: user.id,
            finalized_at: new Date().toISOString()
        })
        .eq('id', resultId);

    if (error) throw error;

    // Audit Log
    await createAuditLog('FINALIZE', 'test_results', resultId);
};

export const revertResults = async (resultId: string, reason: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('test_results')
        .update({
            status: 'pending',
            reverted_by: user.id,
            reverted_at: new Date().toISOString()
        })
        .eq('id', resultId);

    if (error) throw error;

    // Audit Log - Include reason but not result values
    await createAuditLog('REVERT', 'test_results', resultId, {
        reason
    });
};
