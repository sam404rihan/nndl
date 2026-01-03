"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DEFAULT_TAT_HOURS, getHoursPending, isDelayed } from '@/lib/tat';
import {
    storeMetrics,
    getYesterdayMetrics,
    calculateDelta,
    getDeltaIcon,
    getDeltaColor,
    formatDelta,
    type DashboardMetrics,
    type Delta
} from '@/lib/deltas';

interface KPIData {
    totalTestsToday: number;
    samplesInProcess: number;
    reportsPendingApproval: number;
    reportsDeliveredToday: number;
    delayedReports: number;
    oldestPendingHours: number;
}

interface KPITile {
    label: string;
    value: number;
    isWarning: boolean;
    delta?: Delta;
    subtitle?: string;
    isGoodWhenUp?: boolean;
}

export default function PrimaryKPITiles() {
    const [kpis, setKpis] = useState<KPIData>({
        totalTestsToday: 0,
        samplesInProcess: 0,
        reportsPendingApproval: 0,
        reportsDeliveredToday: 0,
        delayedReports: 0,
        oldestPendingHours: 0,
    });
    const [loading, setLoading] = useState(true);
    const [yesterdayData, setYesterdayData] = useState<DashboardMetrics | null>(null);

    useEffect(() => {
        // Load yesterday's data for comparison
        const yesterday = getYesterdayMetrics();
        setYesterdayData(yesterday);

        const loadKPIs = async () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayISO = today.toISOString();

            // Get default TAT from settings or use fallback
            const { data: settings } = await supabase
                .from('lab_settings')
                .select('default_tat_hours')
                .single();

            const defaultTAT = settings?.default_tat_hours || DEFAULT_TAT_HOURS;

            // Run all queries in parallel
            const [
                totalToday,
                inProcess,
                pendingApproval,
                deliveredToday,
                allPending,
                oldestOrder
            ] = await Promise.all([
                // Total tests today
                supabase
                    .from('orders')
                    .select('id', { count: 'exact', head: true })
                    .gte('created_at', todayISO),

                // Samples in process
                supabase
                    .from('orders')
                    .select('id', { count: 'exact', head: true })
                    .eq('status', 'in_process'),

                // Reports pending approval
                supabase
                    .from('orders')
                    .select('id', { count: 'exact', head: true })
                    .eq('status', 'pending_approval'),

                // Reports delivered today
                supabase
                    .from('orders')
                    .select('id', { count: 'exact', head: true })
                    .eq('status', 'delivered')
                    .gte('updated_at', todayISO),

                // All pending orders (not delivered/cancelled) for delayed calculation
                supabase
                    .from('orders')
                    .select('created_at')
                    .in('status', ['pending', 'in_process', 'pending_approval']),

                // Oldest pending order
                supabase
                    .from('orders')
                    .select('created_at')
                    .in('status', ['pending', 'in_process', 'pending_approval'])
                    .order('created_at', { ascending: true })
                    .limit(1)
            ]);

            // Calculate delayed reports based on 5h TAT
            let delayedCount = 0;
            if (allPending.data) {
                delayedCount = allPending.data.filter(order =>
                    isDelayed(order.created_at, 5)
                ).length;
            }

            // Calculate oldest pending hours
            let oldestHours = 0;
            if (oldestOrder.data && oldestOrder.data.length > 0) {
                oldestHours = getHoursPending(oldestOrder.data[0].created_at);
            }

            const currentMetrics: KPIData = {
                totalTestsToday: totalToday.count || 0,
                samplesInProcess: inProcess.count || 0,
                reportsPendingApproval: pendingApproval.count || 0,
                reportsDeliveredToday: deliveredToday.count || 0,
                delayedReports: delayedCount,
                oldestPendingHours: oldestHours,
            };

            setKpis(currentMetrics);
            setLoading(false);

            // Store today's metrics for tomorrow
            storeMetrics({
                ...currentMetrics,
                timestamp: new Date().toISOString(),
            });
        };

        loadKPIs();
    }, []);

    // Calculate deltas
    const getDeltas = (): Record<string, Delta | undefined> => {
        if (!yesterdayData) return {};

        return {
            totalTestsToday: calculateDelta(kpis.totalTestsToday, yesterdayData.totalTestsToday),
            samplesInProcess: calculateDelta(kpis.samplesInProcess, yesterdayData.samplesInProcess),
            reportsPendingApproval: calculateDelta(kpis.reportsPendingApproval, yesterdayData.reportsPendingApproval),
            reportsDeliveredToday: calculateDelta(kpis.reportsDeliveredToday, yesterdayData.reportsDeliveredToday),
            delayedReports: calculateDelta(kpis.delayedReports, yesterdayData.delayedReports),
            oldestPendingHours: calculateDelta(kpis.oldestPendingHours, yesterdayData.oldestPendingHours),
        };
    };

    const deltas = getDeltas();

    const tiles: KPITile[] = [
        {
            label: 'Total Tests Today',
            value: kpis.totalTestsToday,
            isWarning: false,
            delta: deltas.totalTestsToday,
            isGoodWhenUp: true,
        },
        {
            label: 'Samples In Process',
            value: kpis.samplesInProcess,
            isWarning: false,
            delta: deltas.samplesInProcess,
            isGoodWhenUp: false,
        },
        {
            label: 'Pending Approval',
            value: kpis.reportsPendingApproval,
            isWarning: kpis.reportsPendingApproval > 10,
            delta: deltas.reportsPendingApproval,
            isGoodWhenUp: false,
        },
        {
            label: 'Delivered Today',
            value: kpis.reportsDeliveredToday,
            isWarning: false,
            delta: deltas.reportsDeliveredToday,
            isGoodWhenUp: true,
        },
        {
            label: 'Delayed Reports',
            value: kpis.delayedReports,
            isWarning: true,
            subtitle: 'Exceeds 5h TAT',
            delta: deltas.delayedReports,
            isGoodWhenUp: false,
        },
        {
            label: 'Oldest Pending',
            value: kpis.oldestPendingHours,
            isWarning: kpis.oldestPendingHours > 48,
            subtitle: kpis.oldestPendingHours > 0 ? 'hours' : 'none',
            delta: deltas.oldestPendingHours,
            isGoodWhenUp: false,
        },
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-6 gap-4">
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className="p-6 text-center border"
                        style={{
                            background: 'var(--color-surface)',
                            borderColor: 'var(--color-border)',
                            borderRadius: 'var(--radius-lg)',
                            boxShadow: 'var(--shadow-sm)'
                        }}
                    >
                        <div style={{ color: 'var(--color-text-disabled)' }}>Loading...</div>
                    </div>
                ))}
            </div>
        );
    }

    // Check if all is clear
    const allClear = kpis.delayedReports === 0 &&
        kpis.reportsPendingApproval < 5 &&
        kpis.oldestPendingHours < 24;

    return (
        <div>
            {allClear && (
                <div
                    className="mb-5 px-5 py-3 flex items-center gap-2"
                    style={{
                        background: 'var(--color-success-bg)',
                        border: '2px solid var(--color-success-border)',
                        borderRadius: 'var(--radius-md)',
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
                        All reports within TAT. No critical delays.
                    </span>
                </div>
            )}

            <div className="grid grid-cols-6 gap-5">
                {tiles.map((tile, index) => (
                    <div
                        key={index}
                        className="p-6 text-center transition-all border-2"
                        style={{
                            background: tile.isWarning && tile.value > 0 ? 'var(--color-warning-bg)' : 'var(--color-surface)',
                            borderColor: tile.isWarning && tile.value > 0 ? 'var(--color-warning-border)' : 'var(--color-border)',
                            borderRadius: 'var(--radius-lg)',
                            boxShadow: 'var(--shadow-sm)'
                        }}
                    >
                        <div
                            className="text-4xl font-bold mb-2"
                            style={{
                                color: tile.isWarning && tile.value > 0 ? 'var(--color-warning)' : 'var(--color-text-primary)'
                            }}
                        >
                            {tile.value}
                        </div>

                        {/* Delta Indicator */}
                        {tile.delta && tile.delta.direction !== 'same' && (
                            <div className={`text-xs font-bold mb-1 ${getDeltaColor(tile.delta, tile.isGoodWhenUp || false)}`}>
                                {getDeltaIcon(tile.delta)} {formatDelta(tile.delta, tile.isGoodWhenUp)}
                            </div>
                        )}

                        <div
                            className="uppercase tracking-wide font-semibold"
                            style={{
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--color-text-secondary)'
                            }}
                        >
                            {tile.label}
                        </div>

                        {/* Subtitle */}
                        {tile.subtitle && (
                            <div
                                className="mt-1 font-medium"
                                style={{
                                    fontSize: 'var(--font-size-xs)',
                                    color: 'var(--color-text-tertiary)'
                                }}
                            >
                                {tile.subtitle}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
