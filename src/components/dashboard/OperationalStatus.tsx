"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getHoursPending } from '@/lib/tat';

interface StatusCount {
    status: string;
    count: number;
    oldestHours: number;
}

export default function OperationalStatus() {
    const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStatusCounts = async () => {
            // Define expected statuses (matching actual workflow)
            const statuses = [
                { db: 'registered', display: 'Registered' },
                { db: 'sample_collected', display: 'Sample Collected' },
                { db: 'in_process', display: 'In Process' },
                { db: 'pending_approval', display: 'Completed' }
            ];

            const counts = await Promise.all(
                statuses.map(async ({ db, display }) => {
                    // Get count
                    const { count } = await supabase
                        .from('orders')
                        .select('id', { count: 'exact', head: true })
                        .eq('status', db);

                    // Get oldest order in this status
                    const { data: oldestData } = await supabase
                        .from('orders')
                        .select('created_at')
                        .eq('status', db)
                        .order('created_at', { ascending: true })
                        .limit(1);

                    let oldestHours = 0;
                    if (oldestData && oldestData.length > 0) {
                        oldestHours = getHoursPending(oldestData[0].created_at);
                    }

                    return { status: display, count: count || 0, oldestHours };
                })
            );

            setStatusCounts(counts);
            setLoading(false);
        };

        loadStatusCounts();
    }, []);

    const getOldestColor = (hours: number) => {
        if (hours > 48) return 'text-red-600';
        if (hours > 24) return 'text-orange-600';
        return 'text-slate-600';
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
                <div style={{ color: 'var(--color-text-disabled)' }}>Loading status...</div>
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
                className="border-b-2 px-6 py-3"
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
                    Sample Status Summary
                </h3>
            </div>
            <table className="w-full">
                <thead
                    className="border-b-2"
                    style={{
                        background: 'var(--color-background)',
                        borderColor: 'var(--color-border)'
                    }}
                >
                    <tr>
                        <th
                            className="px-6 py-2 text-left uppercase tracking-wide font-bold"
                            style={{
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--color-text-secondary)'
                            }}
                        >
                            Status
                        </th>
                        <th
                            className="px-6 py-2 text-right uppercase tracking-wide font-bold"
                            style={{
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--color-text-secondary)'
                            }}
                        >
                            Count
                        </th>
                        <th
                            className="px-6 py-2 text-right uppercase tracking-wide font-bold"
                            style={{
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--color-text-secondary)'
                            }}
                        >
                            Oldest
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y-2" style={{ borderColor: 'var(--color-border-subtle)' }}>
                    {statusCounts.map((item) => (
                        <tr key={item.status} className="transition-colors">
                            <td
                                className="px-6 py-3 font-semibold"
                                style={{
                                    fontSize: 'var(--font-size-sm)',
                                    color: 'var(--color-text-secondary)'
                                }}
                            >
                                {item.status}
                            </td>
                            <td
                                className="px-6 py-3 text-right text-xl font-bold"
                                style={{ color: 'var(--color-text-primary)' }}
                            >
                                {item.count}
                            </td>
                            <td className={`px-6 py-3 text-right text-sm font-bold ${getOldestColor(item.oldestHours)}`}>
                                {item.count > 0 ? (
                                    item.oldestHours > 0 ? `${item.oldestHours}h` : '—'
                                ) : (
                                    '—'
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
