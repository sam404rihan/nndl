"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Severity = 'critical' | 'warning' | 'ok';

interface HealthItem {
    label: string;
    value: string;
    severity: Severity;
    icon: string;
}

interface SystemHealthData {
    lastBackup: string;
    lastBackupDate: Date | null;
    auditLoggingActive: boolean;
    systemStatus: 'Active' | 'Degraded' | 'Down';
}

export default function SystemHealth() {
    const [health, setHealth] = useState<SystemHealthData>({
        lastBackup: 'N/A',
        lastBackupDate: null,
        auditLoggingActive: false,
        systemStatus: 'Active',
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadSystemHealth = async () => {
            // Check audit logs for recent activity
            const { data: auditData } = await supabase
                .from('audit_logs')
                .select('created_at')
                .order('created_at', { ascending: false })
                .limit(1);

            const auditActive = !!(auditData && auditData.length > 0);

            // Check lab settings for backup info
            const { data: settingsData } = await supabase
                .from('lab_settings')
                .select('last_backup')
                .single();

            let backupTime = 'Not configured';
            let backupDate: Date | null = null;

            if (settingsData?.last_backup) {
                backupDate = new Date(settingsData.last_backup);
                backupTime = backupDate.toLocaleString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                });
            }

            setHealth({
                lastBackup: backupTime,
                lastBackupDate: backupDate,
                auditLoggingActive: auditActive,
                systemStatus: 'Active',
            });
            setLoading(false);
        };

        loadSystemHealth();
    }, []);

    const getBackupSeverity = (): Severity => {
        if (!health.lastBackupDate) return 'critical';

        const hoursSinceBackup = (Date.now() - health.lastBackupDate.getTime()) / (1000 * 60 * 60);

        if (hoursSinceBackup > 168) return 'critical'; // >7 days
        if (hoursSinceBackup > 72) return 'warning';   // >3 days
        return 'ok';
    };

    const getHealthItems = (): HealthItem[] => {
        return [
            {
                label: 'System Status',
                value: health.systemStatus,
                severity: health.systemStatus === 'Active' ? 'ok' : 'warning',
                icon: health.systemStatus === 'Active' ? '✓' : '⚠',
            },
            {
                label: 'Audit Logging',
                value: health.auditLoggingActive ? 'Active' : 'Inactive',
                severity: health.auditLoggingActive ? 'ok' : 'critical',
                icon: health.auditLoggingActive ? '✓' : '⚠',
            },
            {
                label: 'Last Backup',
                value: health.lastBackup,
                severity: getBackupSeverity(),
                icon: getBackupSeverity() === 'ok' ? '✓' : '⚠',
            },
        ];
    };

    const getSeverityStyles = (severity: Severity) => {
        switch (severity) {
            case 'critical':
                return {
                    bg: 'bg-red-50',
                    border: 'border-red-400',
                    text: 'text-red-800',
                    icon: 'text-red-600',
                };
            case 'warning':
                return {
                    bg: 'bg-yellow-50',
                    border: 'border-yellow-400',
                    text: 'text-yellow-800',
                    icon: 'text-yellow-600',
                };
            case 'ok':
                return {
                    bg: 'bg-green-50',
                    border: 'border-green-300',
                    text: 'text-green-800',
                    icon: 'text-green-600',
                };
        }
    };

    if (loading) {
        return (
            <div
                className="border p-4"
                style={{
                    background: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-sm)'
                }}
            >
                <div
                    style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-disabled)'
                    }}
                >
                    Loading system health...
                </div>
            </div>
        );
    }

    const healthItems = getHealthItems();
    const hasCritical = healthItems.some(item => item.severity === 'critical');
    const allOk = healthItems.every(item => item.severity === 'ok');

    return (
        <div
            className="border-2"
            style={{
                borderColor: hasCritical ? 'var(--color-error-border)' : 'var(--color-border)',
                background: hasCritical ? 'var(--color-error-bg)' : 'var(--color-background)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-sm)'
            }}
        >
            <div className="px-6 py-3">
                <div className="flex items-center justify-between">
                    {/* Health Items */}
                    <div className="flex items-center gap-5">
                        {healthItems.map((item, index) => {
                            const styles = getSeverityStyles(item.severity);
                            return (
                                <div
                                    key={index}
                                    className={`flex items-center gap-2 px-3 py-2 rounded border-2 ${styles.bg} ${styles.border}`}
                                >
                                    <span className={`font-bold text-base ${styles.icon}`}>
                                        {item.icon}
                                    </span>
                                    <div>
                                        <span
                                            className="uppercase tracking-wide font-semibold block"
                                            style={{
                                                fontSize: 'var(--font-size-xs)',
                                                color: 'var(--color-text-secondary)'
                                            }}
                                        >
                                            {item.label}
                                        </span>
                                        <span className={`text-xs font-bold ${styles.text}`}>
                                            {item.value}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Overall Status Message */}
                    {allOk && (
                        <div className="text-xs font-semibold text-green-800 flex items-center gap-2 bg-green-100 px-3 py-2 rounded border-2 border-green-300">
                            <span className="text-green-600 text-base">✓</span>
                            All systems operational
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
