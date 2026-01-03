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
                className="border p-6"
                style={{
                    background: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-sm)'
                }}
            >
                <div style={{ color: 'var(--color-text-disabled)' }}>Loading exceptions...</div>
            </div>
        );
    }

    return (
        <div
            className="border-2"
            style={{
                background: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-sm)'
            }}
        >
            <div
                className="border-b-2 px-6 py-3 flex items-center justify-between"
                style={{
                    borderColor: 'var(--color-border)',
                    background: 'var(--color-background)'
                }}
            >
                <h3
                    className="font-bold uppercase tracking-wide"
                    style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-secondary)'
                    }}
                >
                    Exceptions & Attention Required
                </h3>
                {exceptions.length > 0 && (
                    <span
                        className="font-semibold px-2 py-1 rounded"
                        style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--color-text-secondary)',
                            background: 'var(--color-background)',
                            border: '1px solid var(--color-border)'
                        }}
                    >
                        Exceeds {defaultTAT}h TAT
                    </span>
                )}
            </div>

            {exceptions.length === 0 ? (
                <div className="px-6 py-10 text-center">
                    <div
                        className="inline-flex items-center gap-2 px-5 py-3 rounded border-2"
                        style={{
                            background: 'var(--color-success-bg)',
                            borderColor: 'var(--color-success-border)',
                            boxShadow: 'var(--shadow-sm)'
                        }}
                    >
                        <span
                            className="text-xl font-bold"
                            style={{ color: 'var(--color-success)' }}
                        >
                            ✓
                        </span>
                        <span
                            className="font-semibold"
                            style={{
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--color-success)'
                            }}
                        >
                            No exceptions. All reports within TAT.
                        </span>
                    </div>
                </div>
            ) : (
                <div
                    className="divide-y-2 divide-slate-200 overflow-y-auto"
                    style={{
                        maxHeight: 'calc(3 * 140px)',
                    }}
                >
                    <style jsx>{`
                        div::-webkit-scrollbar {
                            width: 6px;
                        }
                        div::-webkit-scrollbar-track {
                            background: #f1f5f9;
                        }
                        div::-webkit-scrollbar-thumb {
                            background: #cbd5e1;
                            border-radius: 3px;
                        }
                        div::-webkit-scrollbar-thumb:hover {
                            background: #94a3b8;
                        }
                    `}</style>
                    {exceptions.map((exception) => (
                        <Link
                            key={exception.id}
                            href={`/dashboard/orders?id=${exception.id}`}
                            className={`block px-6 py-4 border-l-4 transition-all cursor-pointer ${getSeverityColor(exception.hours_pending, exception.expected_tat_hours)}`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                {/* Left: Patient & Order Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="font-mono text-xs font-semibold text-slate-600 flex-shrink-0 bg-slate-100 px-2 py-0.5 rounded">
                                            {exception.id.slice(0, 8)}
                                        </span>
                                        <span className="font-semibold text-base text-slate-900 truncate">
                                            {exception.patient_name}
                                        </span>
                                        {exception.is_oldest && (
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${getSeverityBadge(exception.hours_pending, exception.expected_tat_hours)}`}>
                                                OLDEST
                                            </span>
                                        )}
                                    </div>

                                    {/* Status */}
                                    <div className="flex items-center gap-4 text-xs">
                                        <span className="font-semibold uppercase tracking-wide px-2 py-1 bg-white border-2 border-slate-300 rounded text-slate-700">
                                            {exception.status.replace('_', ' ')}
                                        </span>
                                        <span className="text-slate-600 font-medium">
                                            Created: {new Date(exception.created_at).toLocaleDateString('en-IN', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                    </div>
                                </div>

                                {/* Right: TAT Info */}
                                <div className="text-right flex-shrink-0">
                                    <div className="text-base font-bold text-slate-900 mb-1">
                                        {exception.hours_pending}h / {exception.expected_tat_hours}h
                                    </div>
                                    <div className="text-xs font-semibold text-red-600 mb-1">
                                        {exception.hours_pending - exception.expected_tat_hours}h overdue
                                    </div>
                                    <div className="text-xs text-blue-600 font-semibold">
                                        VIEW DETAILS →
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
