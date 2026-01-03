import { supabase } from '@/lib/supabase';

/**
 * Centralized audit logging utility for HIPAA compliance
 * Logs all database operations performed by users
 */

export type AuditAction =
    // Authentication
    | 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED'
    // Patient
    | 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'ARCHIVE' | 'RESTORE'
    // Orders/Test Requests
    | 'CANCEL'
    // Results
    | 'FINALIZE' | 'REVERT'
    // Reports
    | 'GENERATE' | 'APPROVE' | 'REVOKE' | 'VIEW' | 'DOWNLOAD' | 'PRINT' | 'DELIVER'
    // Billing
    | 'INVOICE_CREATE' | 'INVOICE_UPDATE' | 'PAYMENT_RECORD'
    // Export
    | 'EXPORT_PATIENT' | 'EXPORT_REPORT' | 'API_ACCESS';

export interface AuditLogEntry {
    action: AuditAction;
    table_name: string;
    record_id: string;
    performed_by?: string;
    timestamp?: string;
    metadata?: Record<string, any>;
    ip_address?: string;
    user_agent?: string;
}

/**
 * Create an audit log entry
 * @param action - The type of action performed
 * @param tableName - The database table affected
 * @param recordId - The ID of the record affected
 * @param metadata - Optional additional context
 * @param ipAddress - Optional IP address of the user
 * @param userAgent - Optional user agent string
 */
export const createAuditLog = async (
    action: AuditAction,
    tableName: string,
    recordId: string,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
): Promise<void> => {
    try {
        // Get current authenticated user
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.warn('Audit log attempted without authenticated user');
            return;
        }

        const logEntry: AuditLogEntry = {
            action,
            table_name: tableName,
            record_id: recordId,
            performed_by: user.id,
            timestamp: new Date().toISOString(),
            ...(metadata && { metadata }),
            ...(ipAddress && { ip_address: ipAddress }),
            ...(userAgent && { user_agent: userAgent })
        };

        const { error } = await supabase
            .from('audit_logs')
            .insert(logEntry);

        if (error) {
            console.error('Failed to create audit log:', error);
            // Don't throw - audit logging shouldn't break the main operation
        }
    } catch (error) {
        console.error('Audit logging error:', error);
        // Silently fail - don't break user operations
    }
};

/**
 * Batch create multiple audit log entries
 * Useful for bulk operations
 */
export const createBatchAuditLogs = async (
    entries: Array<{
        action: AuditAction;
        tableName: string;
        recordId: string;
        metadata?: Record<string, any>;
    }>
): Promise<void> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        const logEntries = entries.map(entry => ({
            action: entry.action,
            table_name: entry.tableName,
            record_id: entry.recordId,
            performed_by: user.id,
            timestamp: new Date().toISOString(),
            ...(entry.metadata && { metadata: entry.metadata })
        }));

        const { error } = await supabase
            .from('audit_logs')
            .insert(logEntries);

        if (error) {
            console.error('Failed to create batch audit logs:', error);
        }
    } catch (error) {
        console.error('Batch audit logging error:', error);
    }
};

/**
 * Query audit logs for a specific record
 * Useful for viewing history of changes
 */
export const getAuditLogsForRecord = async (
    tableName: string,
    recordId: string
): Promise<AuditLogEntry[]> => {
    try {
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*, profiles(email)')
            .eq('table_name', tableName)
            .eq('record_id', recordId)
            .order('timestamp', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        return [];
    }
};

/**
 * Query audit logs for a specific user
 * Useful for compliance reporting
 */
export const getAuditLogsForUser = async (
    userId: string,
    limit: number = 50
): Promise<AuditLogEntry[]> => {
    try {
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('performed_by', userId)
            .order('timestamp', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching user audit logs:', error);
        return [];
    }
};
