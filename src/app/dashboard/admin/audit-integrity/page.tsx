'use client';

import { useState, useEffect } from 'react';
import {
  getAuditChainHealth,
  verifyRecentAuditLogs,
  getAuditChainStatus,
  AuditChainHealth,
} from '@/lib/auditChain';
import { Shield, AlertTriangle, CheckCircle, RefreshCw, Database } from 'lucide-react';

export default function AuditIntegrityPage() {
  const [health, setHealth] = useState<AuditChainHealth | null>(null);
  const [recentVerification, setRecentVerification] = useState<any>(null);
  const [chainStatus, setChainStatus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [healthData, verificationData, statusData] = await Promise.all([
        getAuditChainHealth(),
        verifyRecentAuditLogs(100),
        getAuditChainStatus(50),
      ]);

      setHealth(healthData);
      setRecentVerification(verificationData);
      setChainStatus(statusData);
    } catch (error) {
      console.error('Failed to load audit chain data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runFullVerification = async () => {
    setVerifying(true);
    try {
      const result = await verifyRecentAuditLogs(1000);
      setRecentVerification(result);
      await loadData(); // Refresh all data
    } catch (error) {
      console.error('Verification failed:', error);
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-slate-600">Loading audit chain data...</p>
        </div>
      </div>
    );
  }

  const isCompromised = health?.integrity_status.includes('COMPROMISED');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-600" />
            Audit Chain Integrity
          </h1>
          <p className="text-slate-600 mt-1">
            Tamper-evident audit log verification and monitoring
          </p>
        </div>
        <button
          onClick={runFullVerification}
          disabled={verifying}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${verifying ? 'animate-spin' : ''}`} />
          {verifying ? 'Verifying...' : 'Run Verification'}
        </button>
      </div>

      {/* Alert Banner */}
      {isCompromised && (
        <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-900">CRITICAL: Tampering Detected</h3>
            <p className="text-red-700 mt-1">
              The audit log chain has been compromised. Immediate investigation required.
            </p>
          </div>
        </div>
      )}

      {/* Health Overview */}
      {health && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm">Chain Status</span>
              {isCompromised ? (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
            </div>
            <p className={`text-2xl font-bold ${isCompromised ? 'text-red-600' : 'text-green-600'}`}>
              {isCompromised ? 'COMPROMISED' : 'VERIFIED'}
            </p>
            <p className="text-xs text-slate-500 mt-1">{health.integrity_status}</p>
          </div>

          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm">Total Audit Logs</span>
              <Database className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {health.total_logs.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {new Date(health.chain_start).toLocaleDateString()} - {new Date(health.chain_end).toLocaleDateString()}
            </p>
          </div>

          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm">Recent Verification</span>
              <CheckCircle className={`w-5 h-5 ${recentVerification?.isValid ? 'text-green-500' : 'text-red-500'}`} />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {recentVerification?.totalChecked || 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {recentVerification?.compromisedLogs?.length || 0} issues found
            </p>
          </div>
        </div>
      )}

      {/* Hash Information */}
      {health && (
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Chain Hashes</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase">Genesis Hash</label>
              <p className="font-mono text-sm bg-slate-50 p-2 rounded mt-1 break-all">
                {health.genesis_hash}
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase">Latest Hash</label>
              <p className="font-mono text-sm bg-slate-50 p-2 rounded mt-1 break-all">
                {health.latest_hash}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Compromised Logs */}
      {recentVerification?.compromisedLogs?.length > 0 && (
        <div className="bg-white border border-red-300 rounded-lg p-6">
          <h2 className="text-lg font-bold text-red-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Compromised Logs Detected
          </h2>
          <div className="space-y-2">
            {recentVerification.compromisedLogs.map((log: any) => (
              <div key={log.log_id} className="bg-red-50 border border-red-200 rounded p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-red-900">Sequence: {log.sequence_number}</p>
                    <p className="text-sm text-red-700">Log ID: {log.log_id}</p>
                    <p className="text-sm text-red-600 mt-1">{log.error_message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Chain Status */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Audit Chain Status</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-3 font-semibold text-slate-700">Sequence</th>
                <th className="text-left p-3 font-semibold text-slate-700">Timestamp</th>
                <th className="text-left p-3 font-semibold text-slate-700">Action</th>
                <th className="text-left p-3 font-semibold text-slate-700">Table</th>
                <th className="text-left p-3 font-semibold text-slate-700">Status</th>
                <th className="text-left p-3 font-semibold text-slate-700">Hash</th>
              </tr>
            </thead>
            <tbody>
              {chainStatus.map((log) => (
                <tr key={log.id} className="border-b hover:bg-slate-50">
                  <td className="p-3">{log.sequence_number}</td>
                  <td className="p-3">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3">{log.table_name}</td>
                  <td className="p-3">
                    {log.chain_status === 'VALID' || log.chain_status === 'GENESIS' ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        {log.chain_status}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600">
                        <AlertTriangle className="w-4 h-4" />
                        {log.chain_status}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="font-mono text-xs text-slate-600">
                      {log.current_hash?.substring(0, 16)}...
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Information Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-blue-900 mb-2">About Hash-Chained Audit Logs</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>
            This system uses cryptographic hash chaining (similar to blockchain) to create a tamper-evident
            audit trail. Each log entry contains:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>A hash of its own contents</li>
            <li>A hash of the previous log entry</li>
            <li>A sequential number for ordering</li>
          </ul>
          <p className="mt-3">
            <strong>What this means:</strong> If anyone attempts to modify, delete, or insert a past audit
            log entry, the hash chain will break and the tampering will be immediately detected during
            verification.
          </p>
          <p className="mt-2">
            <strong>Compliance benefit:</strong> This provides cryptographic proof that audit logs have not
            been tampered with, exceeding HIPAA audit trail requirements.
          </p>
        </div>
      </div>
    </div>
  );
}
