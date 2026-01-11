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
                { db: ['pending'], display: 'Pending Payment' },
                { db: ['registered'], display: 'Registered' },
                { db: ['in_process'], display: 'In Process' },
                { db: ['completed'], display: 'Completed' }
            ];

            const counts = await Promise.all(
                statuses.map(async ({ db, display }) => {
                    // Get count
                    const { count } = await supabase
                        .from('orders')
                        .select('id', { count: 'exact', head: true })
                        .in('status', db);

                    // Get oldest order in this status (only for non-completed statuses)
                    let oldestHours = 0;
                    if (display !== 'Completed') {
                        const { data: oldestData } = await supabase
                            .from('orders')
                            .select('created_at')
                            .in('status', db)
                            .order('created_at', { ascending: true })
                            .limit(1);

                        if (oldestData && oldestData.length > 0) {
                            oldestHours = getHoursPending(oldestData[0].created_at);
                        }
                    }

                    return { status: display, count: count || 0, oldestHours };
                })
            );

            setStatusCounts(counts);
            setLoading(false);
        };

        loadStatusCounts();
        
        // Auto-refresh every 30 seconds
        const interval = setInterval(loadStatusCounts, 30000);
        
        return () => clearInterval(interval);
    }, []);

    const getOldestColor = (hours: number) => {
        if (hours > 48) return 'text-red-600';
        if (hours > 24) return 'text-orange-600';
        return 'text-slate-600';
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
                    <div className="h-6 bg-slate-100 rounded w-24"></div>
                </div>
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-12 bg-slate-100 rounded"></div>
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
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#FEF3E2' }}>
                        <svg className="w-5 h-5" style={{ color: '#F59E0B' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <h3
                        className="font-semibold"
                        style={{
                            fontSize: '1rem',
                            color: '#1F2937'
                        }}
                    >
                        Order Statistics
                    </h3>
                </div>
                <button className="px-3 py-1.5 rounded-lg text-sm" style={{ border: '1px solid rgba(0,0,0,0.1)', color: '#6B7280' }}>
                    Last 30 days
                </button>
            </div>
            <div className="p-6">
                <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                        <div className="text-xs font-medium mb-1" style={{ color: '#9CA3AF' }}>Total Orders</div>
                        <span className="text-2xl font-bold" style={{ color: '#1F2937' }}>
                            {statusCounts.reduce((sum, s) => sum + s.count, 0).toLocaleString()}
                        </span>
                    </div>
                    <div>
                        <div className="text-xs font-medium mb-1" style={{ color: '#9CA3AF' }}>Oldest Pending</div>
                        <span className="text-2xl font-bold" style={{ color: '#1F2937' }}>
                            {Math.max(...statusCounts.map(s => s.oldestHours))}h
                        </span>
                    </div>
                </div>
                <table className="w-full">
                    <tbody className="divide-y" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
                        {statusCounts.map((item) => (
                            <tr key={item.status} className="transition-colors hover:bg-slate-50">
                                <td
                                    className="py-3 font-medium"
                                    style={{
                                        fontSize: '0.875rem',
                                        color: '#6B7280'
                                    }}
                                >
                                    {item.status}
                                </td>
                                <td
                                    className="py-3 text-right text-lg font-bold"
                                    style={{ color: '#1F2937' }}
                                >
                                    {item.count}
                                </td>
                                <td className={`py-3 text-right text-sm font-semibold ${getOldestColor(item.oldestHours)}`}>
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
        </div>
    );
}
