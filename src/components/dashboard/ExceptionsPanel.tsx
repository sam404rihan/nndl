"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { decryptData } from '@/lib/crypto';
import { DEFAULT_TAT_HOURS, getHoursPending, getTATSeverity } from '@/lib/tat';
import Link from 'next/link';

interface Exception {
    id: string;
    patient_name: string;
    status: string;
    created_at: string;
    hours_pending: number;
    expected_tat_hours: number;
    is_oldest: boolean;
}

export default function ExceptionsPanel() {
    const [exceptions, setExceptions] = useState<Exception[]>([]);
    const [loading, setLoading] = useState(true);
    const [defaultTAT, setDefaultTAT] = useState(DEFAULT_TAT_HOURS);

    useEffect(() => {
        const loadExceptions = async () => {
            // Get default TAT from settings
            const { data: settings } = await supabase
                .from('lab_settings')
                .select('default_tat_hours')
                .single();

            const tatHours = settings?.default_tat_hours || DEFAULT_TAT_HOURS;
            setDefaultTAT(tatHours);

            // Calculate threshold time (orders older than TAT)
            const thresholdTime = new Date(Date.now() - tatHours * 60 * 60 * 1000).toISOString();

            // Get delayed orders with related data (exclude completed and delivered)
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    id, 
                    status, 
                    created_at,
                    patients(first_name, last_name)
                `)
                .not('status', 'in', '(completed,delivered)')
                .lt('created_at', thresholdTime)
                .order('created_at', { ascending: true })
                .limit(20);

            if (data) {
                const formattedExceptions = data.map((order: any, index: number) => {
                    const createdAt = new Date(order.created_at);
                    const hoursPending = getHoursPending(order.created_at);

                    let patientName = 'Unknown';
                    if (order.patients) {
                        try {
                            const firstName = decryptData(order.patients.first_name);
                            const lastName = decryptData(order.patients.last_name);
                            patientName = `${firstName} ${lastName}`;
                        } catch {
                            patientName = 'Unknown';
                        }
                    }

                    return {
                        id: order.id,
                        patient_name: patientName,
                        status: order.status,
                        created_at: order.created_at,
                        hours_pending: hoursPending,
                        expected_tat_hours: tatHours,
                        is_oldest: index === 0, // First item is oldest
                    };
                });

                setExceptions(formattedExceptions);
            }
            setLoading(false);
        };

        loadExceptions();
    }, []);

    const getSeverityColor = (hours: number, tatHours: number) => {
        const severity = getTATSeverity(hours, tatHours);

        if (severity === 'critical') return 'bg-red-50 border-red-400 hover:bg-red-100';
        if (severity === 'warning') return 'bg-orange-50 border-orange-400 hover:bg-orange-100';
        return 'bg-yellow-50 border-yellow-300 hover:bg-yellow-100';
    };

    const getSeverityBadge = (hours: number, tatHours: number) => {
        const severity = getTATSeverity(hours, tatHours);

        if (severity === 'critical') return 'bg-red-600 text-white';
        if (severity === 'warning') return 'bg-orange-600 text-white';
        return 'bg-yellow-600 text-white';
    };

    if (loading) {
        return (
            <div
                className="p-6 animate-pulse"
                style={{
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    border: '1px solid rgba(0,0,0,0.05)'
                }}
            >
                <div className="flex justify-between items-start mb-4">
                    <div className="h-5 bg-slate-100 rounded w-1/3"></div>
                    <div className="h-6 bg-slate-100 rounded w-20"></div>
                </div>
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-20 bg-slate-100 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div
            className="overflow-hidden transition-all hover:shadow-lg"
            style={{
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                border: '1px solid rgba(0,0,0,0.05)'
            }}
        >
            <div
                className="px-6 py-4 border-b flex items-center justify-between"
                style={{
                    borderColor: 'rgba(0,0,0,0.06)'
                }}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#FFEBEE' }}>
                        <svg className="w-5 h-5" style={{ color: '#EF4444' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3
                        className="font-semibold"
                        style={{
                            fontSize: '1rem',
                            color: '#1F2937'
                        }}
                    >
                        TAT Exceptions
                    </h3>
                </div>
                {exceptions.length > 0 && (
                    <span
                        className="font-semibold px-3 py-1.5 rounded text-xs"
                        style={{
                            color: '#F59E0B',
                            background: '#FEF3E2',
                            border: '1px solid #FCD34D'
                        }}
                    >
                        {defaultTAT}h TAT
                    </span>
                )}
            </div>

            {exceptions.length === 0 ? (
                <div className="px-6 py-12 text-center">
                    <div
                        className="inline-flex items-center gap-3 px-5 py-3 rounded"
                        style={{
                            background: 'var(--color-success-bg)',
                            border: '1px solid var(--color-success-border)',
                            boxShadow: 'var(--shadow-sm)'
                        }}
                    >
                        <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ 
                                background: 'var(--color-success)',
                                color: 'white'
                            }}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div className="text-left">
                            <p className="font-semibold" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-success)' }}>
                                All Clear
                            </p>
                            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                No exceptions. All reports within TAT.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div
                    className="divide-y overflow-y-auto"
                    style={{
                        maxHeight: 'calc(3 * 120px)',
                        borderColor: 'var(--color-border-subtle)'
                    }}
                >
                    <style jsx>{`
                        div::-webkit-scrollbar {
                            width: 6px;
                        }
                        div::-webkit-scrollbar-track {
                            background: #f7f8fa;
                        }
                        div::-webkit-scrollbar-thumb {
                            background: #cbd5e1;
                            border-radius: 3px;
                        }
                        div::-webkit-scrollbar-thumb:hover {
                            background: #94a3b8;
                        }
                    `}</style>
                    {exceptions.map((exception) => {
                        const severity = getTATSeverity(exception.hours_pending, exception.expected_tat_hours);
                        const borderColor = severity === 'critical' ? '#DC2626' : severity === 'warning' ? '#F59E0B' : '#FBBF24';
                        const bgColor = severity === 'critical' ? '#FEF2F2' : severity === 'warning' ? '#FFFBEB' : '#FEFCE8';
                        
                        return (
                            <Link
                                key={exception.id}
                                href={`/dashboard/orders?id=${exception.id}`}
                                className="block px-6 py-4 transition-all cursor-pointer hover:bg-slate-50"
                                style={{
                                    borderLeft: `3px solid ${borderColor}`,
                                    background: bgColor
                                }}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    {/* Left: Patient & Order Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="font-mono text-xs font-medium shrink-0 px-2 py-0.5 rounded" 
                                                  style={{ background: 'white', color: 'var(--color-text-secondary)' }}>
                                                {exception.id.slice(0, 8)}
                                            </span>
                                            <span className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                                                {exception.patient_name}
                                            </span>
                                            {exception.is_oldest && (
                                                <span className="text-xs font-bold px-2 py-0.5 rounded" 
                                                      style={{ background: borderColor, color: 'white' }}>
                                                    OLDEST
                                                </span>
                                            )}
                                        </div>

                                        {/* Status */}
                                        <div className="flex items-center gap-3" style={{ fontSize: '0.7rem' }}>
                                            <span className="font-semibold uppercase tracking-wide px-2 py-0.5 rounded" 
                                                  style={{ background: 'white', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                                                {exception.status.replace('_', ' ')}
                                            </span>
                                            <span style={{ color: 'var(--color-text-tertiary)' }}>
                                                {new Date(exception.created_at).toLocaleDateString('en-IN', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Right: TAT Info */}
                                    <div className="text-right shrink-0">
                                        <div className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                                            {exception.hours_pending}h / {exception.expected_tat_hours}h
                                        </div>
                                        <div className="text-xs font-semibold mb-1" style={{ color: borderColor }}>
                                            +{exception.hours_pending - exception.expected_tat_hours}h overdue
                                        </div>
                                        <div className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
                                            VIEW →
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
