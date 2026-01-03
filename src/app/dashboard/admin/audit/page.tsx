"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Search, Filter, Download, RefreshCw } from 'lucide-react';
import { decryptData } from '@/lib/crypto';

interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  table_name: string;
  record_id: string;
  performed_by: string;
  user_email?: string;
  user_role?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: any;
  old_values?: any;
  new_values?: any;
  profiles?: {
    email: string;
  };
}

export default function AuditLogs() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Enrichment state
  const [enrichedData, setEnrichedData] = useState<any>(null);
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  const checkAccessAndLoad = async () => {
    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    // Load logs if allowed
    fetchLogs();
  };

  useEffect(() => {
    filterLogs();
  }, [searchQuery, actionFilter, tableFilter, logs]);

  useEffect(() => {
    if (selectedLog) {
      enrichLogData(selectedLog);
    } else {
      setEnrichedData(null);
    }
  }, [selectedLog]);

  const enrichLogData = async (log: AuditLog) => {
    setEnrichmentLoading(true);
    setEnrichedData(null);

    try {
      if (log.table_name === 'orders' && log.action === 'CREATE' && log.metadata?.patient_id) {
        // Fetch Patient Name
        const { data: patient } = await supabase
          .from('patients')
          .select('first_name, last_name')
          .eq('id', log.metadata.patient_id)
          .single();

        // Fetch Test Names with Fallback
        let testNames: string[] = [];
        let testIds: string[] = [];

        // 1. Try metadata
        if (log.metadata?.items && Array.isArray(log.metadata.items)) {
          testIds = log.metadata.items.map((item: any) =>
            (typeof item === 'object' && item?.test_id) ? item.test_id : item
          ).filter(Boolean);
        }

        // 2. Fallback to DB if metadata is empty
        if (testIds.length === 0) {
          const { data: orderTests } = await supabase
            .from('order_tests')
            .select('test_id')
            .eq('order_id', log.record_id);

          if (orderTests) {
            testIds = orderTests.map(i => i.test_id);
          }
        }

        // Fetch test names if this is an order-related action
        if (log.table_name === 'orders' && log.metadata?.items) {
          const testIdsFromMetadata = log.metadata.items;
          const { data: testData } = await supabase
            .from('order_tests')
            .select('test_id, tests(name)')
            .in('test_id', testIdsFromMetadata);

          if (testData) {
            testNames = testData.map((t: any) => t.tests?.name).filter(Boolean);
          }
        }

        if (patient) {
          // Decrypt patient names
          const firstName = decryptData(patient.first_name);
          const lastName = decryptData(patient.last_name);

          setEnrichedData({
            patientName: `${firstName} ${lastName}`,
            tests: testNames
          });
        }
      }
      // Add more enrichment logic for other tables here if needed
    } catch (error) {
      console.error('Error enriching log data:', error);
    } finally {
      setEnrichmentLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching audit logs...');
      const { data, error: fetchError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (fetchError) {
        console.error('Supabase error:', fetchError);
        setError(`Database error: ${fetchError.message}`);
        setLogs([]);
      } else {
        console.log('Fetched logs:', data);
        setLogs(data || []);
      }
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      setError(`Failed to fetch logs: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.table_name.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        log.record_id.toLowerCase().includes(query) ||
        log.profiles?.email?.toLowerCase().includes(query)
      );
    }

    // Action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter);
    }

    // Table filter
    if (tableFilter !== 'all') {
      filtered = filtered.filter(log => log.table_name === tableFilter);
    }

    setFilteredLogs(filtered);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'var(--color-success)';
      case 'UPDATE':
        return 'var(--color-info)';
      case 'DELETE':
        return 'var(--color-error)';
      case 'READ':
        return 'var(--color-text-secondary)';
      case 'LOGIN':
        return 'var(--color-primary)';
      case 'LOGOUT':
        return 'var(--color-text-tertiary)';
      case 'LOGIN_FAILED':
        return 'var(--color-error)';
      default:
        return 'var(--color-text-primary)';
    }
  };

  const getActionBg = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'var(--color-success-bg)';
      case 'UPDATE':
        return 'var(--color-info-bg)';
      case 'DELETE':
        return 'var(--color-error-bg)';
      case 'READ':
        return 'var(--color-background)';
      case 'LOGIN':
        return 'var(--color-primary-light)';
      case 'LOGOUT':
        return 'var(--color-background)';
      case 'LOGIN_FAILED':
        return 'var(--color-error-bg)';
      default:
        return 'var(--color-background)';
    }
  };

  const uniqueTables = Array.from(new Set(logs.map(log => log.table_name))).sort();
  const uniqueActions = Array.from(new Set(logs.map(log => log.action))).sort();

  if (loading) {
    return (
      <div
        className="p-6"
        style={{
          background: 'var(--color-background)',
          minHeight: '100vh'
        }}
      >
        <div style={{ color: 'var(--color-text-disabled)' }}>Loading audit logs...</div>
      </div>
    );
  }

  return (
    <div
      className="p-6"
      style={{
        background: 'var(--color-background)',
        minHeight: '100vh'
      }}
    >
      {/* Detail Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="w-full max-w-3xl bg-white rounded-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--color-surface)' }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h3 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  Audit Log Details
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                  Record ID: {selectedLog.record_id}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 hover:bg-black/5 rounded-full"
                aria-label="Close"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">

              {/* Enriched Content for Orders */}
              {selectedLog.table_name === 'orders' && selectedLog.action === 'CREATE' && (
                <div className="p-4 rounded-lg border border-blue-100" style={{ background: '#EFF6FF' }}>
                  <h4 className="text-sm font-bold mb-3 uppercase tracking-wide text-blue-800 flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    Order Summary
                  </h4>
                  {enrichmentLoading ? (
                    <div className="text-sm text-blue-600 animate-pulse">Loading details...</div>
                  ) : enrichedData ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs font-semibold text-blue-600 uppercase block mb-1">Patient</span>
                          <span className="text-lg font-medium text-blue-900">{enrichedData.patientName}</span>
                        </div>
                        {enrichedData.tests && enrichedData.tests.length > 0 && (
                          <div>
                            <span className="text-xs font-semibold text-blue-600 uppercase block mb-1">Tests Ordered</span>
                            <div className="flex flex-wrap gap-2">
                              {enrichedData.tests.map((test: string, i: number) => (
                                <span key={i} className="px-2 py-1 bg-white text-blue-800 text-sm rounded border border-blue-200">
                                  {test}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {selectedLog.metadata?.total_amount && (
                        <div className="border-t border-blue-200 pt-3">
                          <span className="text-xs font-semibold text-blue-600 uppercase block mb-1">Total Amount</span>
                          <span className="text-base font-medium text-blue-900">
                            ₹{selectedLog.metadata.total_amount}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-blue-600 italic">No additional details available</div>
                  )}
                </div>
              )}

              {/* Key Info Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs uppercase font-bold tracking-wider block mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
                    Action
                  </label>
                  <span
                    className="px-2 py-1 rounded text-sm font-semibold uppercase tracking-wide inline-block"
                    style={{
                      background: getActionBg(selectedLog.action),
                      color: getActionColor(selectedLog.action)
                    }}
                  >
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <label className="text-xs uppercase font-bold tracking-wider block mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
                    Timestamp
                  </label>
                  <span style={{ color: 'var(--color-text-primary)' }}>
                    {new Date(selectedLog.timestamp).toLocaleString()}
                  </span>
                </div>
                <div>
                  <label className="text-xs uppercase font-bold tracking-wider block mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
                    Table Name
                  </label>
                  <span className="font-mono text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    {selectedLog.table_name}
                  </span>
                </div>
                <div>
                  <label className="text-xs uppercase font-bold tracking-wider block mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
                    Performed By
                  </label>
                  <div className="flex flex-col">
                    <span style={{ color: 'var(--color-text-primary)', fontWeight: '500' }}>
                      {selectedLog.user_email || 'System'}
                    </span>
                    {selectedLog.user_role && (
                      <span className="text-xs capitalize" style={{ color: 'var(--color-text-secondary)' }}>
                        Role: {selectedLog.user_role}
                      </span>
                    )}
                    <span className="text-xs font-mono mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                      ID: {selectedLog.performed_by}
                    </span>
                  </div>
                </div>
              </div>

              {/* Security Info - Only for Auth Actions */}
              {['LOGIN', 'LOGIN_FAILED', 'LOGOUT'].includes(selectedLog.action) && (
                <div className="p-4 rounded-lg" style={{ background: 'var(--color-background)' }}>
                  <h4 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                    Security & Context
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-gray-500 block">IP Address</span>
                      <span className="font-mono text-sm">{selectedLog.ip_address || 'Not Recorded'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block">User Agent</span>
                      <span className="text-sm truncate block" title={selectedLog.user_agent}>
                        {selectedLog.user_agent || 'Not Recorded'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* JSON Data Sections */}
              {(selectedLog.old_values || selectedLog.new_values) && (
                <div className="space-y-4">
                  {selectedLog.old_values && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Old Values</h4>
                      <pre className="p-4 rounded-lg overflow-x-auto text-xs font-mono" style={{ background: 'var(--color-background)', color: 'var(--color-text-primary)' }}>
                        {JSON.stringify(selectedLog.old_values, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedLog.new_values && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>New Values</h4>
                      <pre className="p-4 rounded-lg overflow-x-auto text-xs font-mono" style={{ background: 'var(--color-background)', color: 'var(--color-text-primary)' }}>
                        {JSON.stringify(selectedLog.new_values, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-gray-50 flex justify-end" style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)' }}>
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded font-medium transition-colors"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2
            className="text-2xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            System Audit Logs
          </h2>
          <p
            className="mt-1"
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-sm)'
            }}
          >
            HIPAA-compliant activity tracking
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="px-4 py-2 flex items-center gap-2 font-medium"
          style={{
            background: 'var(--color-primary)',
            color: 'white',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div
          className="relative"
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <Search
            size={20}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--color-text-tertiary)' }}
          />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-4 py-3"
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 'var(--font-size-base)',
              color: 'var(--color-text-primary)',
              paddingLeft: '3rem'
            }}
          />
        </div>

        {/* Action Filter */}
        <div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full px-4 py-3"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-base)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Actions</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
        </div>

        {/* Table Filter */}
        <div>
          <select
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            className="w-full px-4 py-3"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-base)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Tables</option>
            {uniqueTables.map(table => (
              <option key={table} value={table}>{table}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          className="p-4"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div
            className="uppercase font-semibold tracking-wide mb-1"
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-tertiary)'
            }}
          >
            Total Logs
          </div>
          <div
            className="text-2xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {filteredLogs.length}
          </div>
        </div>

        <div
          className="p-4"
          style={{
            background: 'var(--color-success-bg)',
            border: '1px solid var(--color-success-border)',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <div
            className="uppercase font-semibold tracking-wide mb-1"
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-success)'
            }}
          >
            Creates
          </div>
          <div
            className="text-2xl font-bold"
            style={{ color: 'var(--color-success)' }}
          >
            {filteredLogs.filter(l => l.action === 'CREATE').length}
          </div>
        </div>

        <div
          className="p-4"
          style={{
            background: 'var(--color-info-bg)',
            border: '1px solid var(--color-info-border)',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <div
            className="uppercase font-semibold tracking-wide mb-1"
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-info)'
            }}
          >
            Updates
          </div>
          <div
            className="text-2xl font-bold"
            style={{ color: 'var(--color-info)' }}
          >
            {filteredLogs.filter(l => l.action === 'UPDATE').length}
          </div>
        </div>

        <div
          className="p-4"
          style={{
            background: 'var(--color-error-bg)',
            border: '1px solid var(--color-error-border)',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <div
            className="uppercase font-semibold tracking-wide mb-1"
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-error)'
            }}
          >
            Deletes
          </div>
          <div
            className="text-2xl font-bold"
            style={{ color: 'var(--color-error)' }}
          >
            {filteredLogs.filter(l => l.action === 'DELETE').length}
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div
        className="border-2 overflow-hidden"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead
              className="border-b-2"
              style={{
                background: 'var(--color-background)',
                borderColor: 'var(--color-border)'
              }}
            >
              <tr>
                <th
                  className="px-6 py-3 text-left uppercase tracking-wide font-bold"
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  Timestamp
                </th>
                <th
                  className="px-6 py-3 text-left uppercase tracking-wide font-bold"
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  Action
                </th>
                <th
                  className="px-6 py-3 text-left uppercase tracking-wide font-bold"
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  Table
                </th>
                <th
                  className="px-6 py-3 text-left uppercase tracking-wide font-bold"
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  Performed By
                </th>
                <th
                  className="px-6 py-3 text-left uppercase tracking-wide font-bold"
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  Record ID
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className="transition-colors hover:bg-opacity-50 cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                  style={{ background: selectedLog?.id === log.id ? 'var(--color-surface-hover)' : 'transparent' }}
                >
                  <td
                    className="px-6 py-4"
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-tertiary)'
                    }}
                  >
                    {new Date(log.timestamp).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-2 py-1 rounded text-xs font-semibold uppercase tracking-wide"
                      style={{
                        background: getActionBg(log.action),
                        color: getActionColor(log.action)
                      }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td
                    className="px-6 py-4 font-mono"
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-secondary)'
                    }}
                  >
                    {log.table_name}
                  </td>
                  <td
                    className="px-6 py-4"
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-primary)'
                    }}
                  >
                    {log.user_email || (log.performed_by ? log.performed_by.substring(0, 8) + '...' : 'System')}
                  </td>
                  <td
                    className="px-6 py-4 font-mono"
                    style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-text-disabled)'
                    }}
                  >
                    {log.record_id.substring(0, 8)}...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div
            className="p-8 text-center"
            style={{ color: 'var(--color-text-disabled)' }}
          >
            {searchQuery || actionFilter !== 'all' || tableFilter !== 'all'
              ? 'No logs match your filters'
              : 'No audit logs found'}
          </div>
        )}
      </div>
    </div>
  );
}