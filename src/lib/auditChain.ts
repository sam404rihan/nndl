import { supabase } from './supabase';

/**
 * Audit Chain Verification Service
 * Provides functions to verify and monitor the integrity of the tamper-evident audit log chain
 */

export interface AuditChainVerification {
  is_valid: boolean;
  sequence_number: number;
  log_id: string;
  expected_hash: string;
  actual_hash: string;
  error_message: string | null;
}

export interface AuditChainHealth {
  total_logs: number;
  chain_start: string;
  chain_end: string;
  genesis_hash: string;
  latest_hash: string;
  integrity_status: string;
}

/**
 * Verify the integrity of the entire audit log chain
 * @returns Array of verification results for each log entry
 */
export async function verifyAuditChain(
  startSequence?: number,
  endSequence?: number
): Promise<AuditChainVerification[]> {
  try {
    const { data, error } = await supabase.rpc('verify_audit_chain', {
      p_start_sequence: startSequence || null,
      p_end_sequence: endSequence || null,
    });

    if (error) {
      console.error('Error verifying audit chain:', error);
      throw error;
    }

    return data as AuditChainVerification[];
  } catch (error) {
    console.error('Failed to verify audit chain:', error);
    throw error;
  }
}

/**
 * Get a summary of the audit chain health and integrity
 * @returns Health statistics and integrity status
 */
export async function getAuditChainHealth(): Promise<AuditChainHealth> {
  try {
    const { data, error } = await supabase.rpc('audit_chain_health');

    if (error) {
      console.error('Error getting audit chain health:', error);
      throw error;
    }

    return (data && data.length > 0 ? data[0] : null) as AuditChainHealth;
  } catch (error) {
    console.error('Failed to get audit chain health:', error);
    throw error;
  }
}

/**
 * Verify recent audit logs (last N entries)
 * @param count Number of recent logs to verify (default: 100)
 * @returns Verification results for recent logs
 */
export async function verifyRecentAuditLogs(count: number = 100): Promise<{
  isValid: boolean;
  totalChecked: number;
  compromisedLogs: AuditChainVerification[];
}> {
  try {
    // Get the latest sequence number
    const { data: maxSeqData, error: seqError } = await supabase
      .from('audit_logs')
      .select('sequence_number')
      .order('sequence_number', { ascending: false })
      .limit(1)
      .single();

    if (seqError) throw seqError;

    const maxSequence = maxSeqData?.sequence_number || 0;
    const startSequence = Math.max(1, maxSequence - count);

    // Verify the range
    const results = await verifyAuditChain(startSequence, maxSequence);

    // Find compromised logs
    const compromised = results.filter((r) => !r.is_valid);

    return {
      isValid: compromised.length === 0,
      totalChecked: results.length,
      compromisedLogs: compromised,
    };
  } catch (error) {
    console.error('Failed to verify recent audit logs:', error);
    throw error;
  }
}

/**
 * Check if any tampering has been detected in the audit chain
 * @returns True if chain is intact, false if tampering detected
 */
export async function isAuditChainIntact(): Promise<boolean> {
  try {
    const health = await getAuditChainHealth();
    return health.integrity_status.includes('VERIFIED');
  } catch (error) {
    console.error('Failed to check audit chain integrity:', error);
    return false;
  }
}

/**
 * Get audit chain status view data
 * @param limit Number of recent logs to fetch
 * @returns Audit chain status with validity indicators
 */
export async function getAuditChainStatus(limit: number = 100) {
  try {
    const { data, error } = await supabase
      .from('audit_chain_status')
      .select('*')
      .limit(limit);

    if (error) {
      console.error('Error getting audit chain status:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to get audit chain status:', error);
    throw error;
  }
}

/**
 * Generate a detailed audit chain report for compliance
 * @returns Comprehensive report of audit chain integrity
 */
export async function generateAuditChainReport(): Promise<{
  health: AuditChainHealth;
  recentVerification: {
    isValid: boolean;
    totalChecked: number;
    compromisedLogs: AuditChainVerification[];
  };
  chainStatus: any[];
  timestamp: string;
}> {
  try {
    const [health, recentVerification, chainStatus] = await Promise.all([
      getAuditChainHealth(),
      verifyRecentAuditLogs(1000),
      getAuditChainStatus(100),
    ]);

    return {
      health,
      recentVerification,
      chainStatus,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to generate audit chain report:', error);
    throw error;
  }
}
