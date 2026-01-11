"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface RevenueData {
    totalRevenueThisMonth: number;
    invoicesGenerated: number;
}

export default function RevenueSnapshot() {
    const [revenue, setRevenue] = useState<RevenueData>({
        totalRevenueThisMonth: 0,
        invoicesGenerated: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadRevenue = async () => {
            const now = new Date();
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            firstDayOfMonth.setHours(0, 0, 0, 0);
            const monthStartISO = firstDayOfMonth.toISOString();

            const [completedThisMonth, invoicesCount] = await Promise.all([
                // Total revenue from PAID orders this month
                supabase
                    .from('orders')
                    .select('total_amount')
                    .eq('payment_status', 'paid')
                    .gte('created_at', monthStartISO),

                // Total invoices (orders) generated this month
                supabase
                    .from('orders')
                    .select('id', { count: 'exact', head: true })
                    .gte('created_at', monthStartISO),
            ]);

            const totalRevenue = completedThisMonth.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

            setRevenue({
                totalRevenueThisMonth: totalRevenue,
                invoicesGenerated: invoicesCount.count || 0,
            });
            setLoading(false);
        };

        loadRevenue();
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
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
                    <div className="h-5 bg-slate-100 rounded w-1/4"></div>
                    <div className="h-6 bg-slate-100 rounded w-24"></div>
                </div>
                <div className="grid grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                        <div key={i}>
                            <div className="h-3 bg-slate-100 rounded w-2/3 mb-2"></div>
                            <div className="h-8 bg-slate-100 rounded w-full"></div>
                        </div>
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
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#ECFDF5' }}>
                        <svg className="w-5 h-5" style={{ color: '#10B981' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3
                        className="font-semibold"
                        style={{
                            fontSize: '1rem',
                            color: '#1F2937'
                        }}
                    >
                        Revenue Snapshot
                    </h3>
                </div>
                <button className="px-3 py-1.5 rounded-lg text-sm" style={{ border: '1px solid rgba(0,0,0,0.1)', color: '#6B7280' }}>
                    This Month
                </button>
            </div>
            <div className="grid grid-cols-2 divide-x" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                <div className="px-6 py-6">
                    <div
                        className="uppercase tracking-wider mb-2 font-medium"
                        style={{
                            fontSize: '0.7rem',
                            color: '#9CA3AF'
                        }}
                    >
                        Total Revenue This Month
                    </div>
                    <div
                        className="text-2xl font-bold"
                        style={{ color: '#1F2937' }}
                    >
                        {formatCurrency(revenue.totalRevenueThisMonth)}
                    </div>
                </div>
                <div className="px-6 py-6">
                    <div
                        className="uppercase tracking-wider mb-2 font-medium"
                        style={{
                            fontSize: '0.7rem',
                            color: '#9CA3AF'
                        }}
                    >
                        Invoices Generated
                    </div>
                    <div
                        className="text-2xl font-bold"
                        style={{ color: '#1F2937' }}
                    >
                        {revenue.invoicesGenerated}
                    </div>
                </div>
            </div>
        </div>
    );
}
