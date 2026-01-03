"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface RevenueData {
    totalRevenueToday: number;
    invoicesGenerated: number;
    pendingPayments: number;
}

export default function RevenueSnapshot() {
    const [revenue, setRevenue] = useState<RevenueData>({
        totalRevenueToday: 0,
        invoicesGenerated: 0,
        pendingPayments: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadRevenue = async () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayISO = today.toISOString();

            const [completedToday, invoicesCount, pendingOrders] = await Promise.all([
                // Total revenue from PAID orders today
                supabase
                    .from('orders')
                    .select('total_amount')
                    .eq('payment_status', 'paid')
                    .gte('created_at', todayISO),

                // Total invoices (orders) generated today
                supabase
                    .from('orders')
                    .select('id', { count: 'exact', head: true })
                    .gte('created_at', todayISO),

                // Pending payments (orders not yet paid) - all unpaid orders (null or not 'paid')
                supabase
                    .from('orders')
                    .select('total_amount')
                    .or('payment_status.is.null,payment_status.neq.paid')
            ]);

            const totalRevenue = completedToday.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
            const pendingTotal = pendingOrders.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

            setRevenue({
                totalRevenueToday: totalRevenue,
                invoicesGenerated: invoicesCount.count || 0,
                pendingPayments: pendingTotal,
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
                className="border p-6"
                style={{
                    background: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-sm)'
                }}
            >
                <div style={{ color: 'var(--color-text-disabled)' }}>Loading revenue...</div>
            </div>
        );
    }

    return (
        <div
            className="border"
            style={{
                background: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-sm)'
            }}
        >
            <div
                className="border-b px-6 py-3"
                style={{
                    borderColor: 'var(--color-border)',
                    background: 'var(--color-background)'
                }}
            >
                <h3
                    className="font-semibold uppercase tracking-wide"
                    style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-secondary)'
                    }}
                >
                    Revenue Snapshot
                </h3>
            </div>
            <div className="grid grid-cols-3 divide-x" style={{ borderColor: 'var(--color-border)' }}>
                <div className="px-6 py-4">
                    <div
                        className="uppercase tracking-wide mb-1"
                        style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--color-text-tertiary)'
                        }}
                    >
                        Total Revenue Today
                    </div>
                    <div
                        className="text-2xl font-bold"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        {formatCurrency(revenue.totalRevenueToday)}
                    </div>
                </div>
                <div className="px-6 py-4">
                    <div
                        className="uppercase tracking-wide mb-1"
                        style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--color-text-tertiary)'
                        }}
                    >
                        Invoices Generated
                    </div>
                    <div
                        className="text-2xl font-bold"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        {revenue.invoicesGenerated}
                    </div>
                </div>
                <div className="px-6 py-4">
                    <div
                        className="uppercase tracking-wide mb-1"
                        style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--color-text-tertiary)'
                        }}
                    >
                        Pending Payments
                    </div>
                    <div
                        className="text-2xl font-bold"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        {formatCurrency(revenue.pendingPayments)}
                    </div>
                </div>
            </div>
        </div>
    );
}
