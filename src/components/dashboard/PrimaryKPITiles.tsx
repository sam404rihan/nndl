"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DEFAULT_TAT_HOURS, getHoursPending, isDelayed } from '@/lib/tat';
import { Users, Calendar, FileText } from 'lucide-react';

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
    subtitle?: string;
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

    useEffect(() => {
        const loadKPIs = async () => {
            // Run all queries in parallel
            const [
                totalPatients,
                totalOrders,
                pendingApproval
            ] = await Promise.all([
                // Total patients (all time)
                supabase
                    .from('patients')
                    .select('id', { count: 'exact', head: true }),

                // Total orders (all time) 
                supabase
                    .from('orders')
                    .select('id', { count: 'exact', head: true }),

                // Reports pending approval
                supabase
                    .from('orders')
                    .select('id', { count: 'exact', head: true })
                    .eq('status', 'pending_approval'),
            ]);

            const currentMetrics: KPIData = {
                totalTestsToday: totalPatients.count || 0,
                samplesInProcess: totalOrders.count || 0,
                reportsPendingApproval: pendingApproval.count || 0,
                reportsDeliveredToday: 0,
                delayedReports: 0,
                oldestPendingHours: 0,
            };

            setKpis(currentMetrics);
            setLoading(false);
        };

        loadKPIs();
        
        // Auto-refresh every 30 seconds
        const interval = setInterval(loadKPIs, 30000);
        
        return () => clearInterval(interval);
    }, []);

    const tiles: KPITile[] = [
        {
            label: 'Total Patients',
            value: kpis.totalTestsToday,
            isWarning: false,
        },
        {
            label: 'Total Orders',
            value: kpis.samplesInProcess,
            isWarning: false,
        },
        {
            label: 'Pending Reports',
            value: kpis.reportsPendingApproval,
            isWarning: kpis.reportsPendingApproval > 10,
        },
    ];

    const iconMap: { [key: string]: any } = {
        'Total Patients': Users,
        'Total Orders': Calendar,
        'Pending Reports': FileText,
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[...Array(3)].map((_, i) => (
                    <div
                        key={i}
                        className="p-6 animate-pulse"
                        style={{
                            background: 'white',
                            borderRadius: '12px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                            border: '1px solid rgba(0,0,0,0.05)'
                        }}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 bg-slate-100 rounded-lg"></div>
                            <div className="w-6 h-6 bg-slate-100 rounded"></div>
                        </div>
                        <div className="h-12 bg-slate-100 rounded mb-3"></div>
                        <div className="h-4 bg-slate-100 rounded w-2/3"></div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">{tiles.map((tile, index) => {
                const isWarningState = tile.isWarning && tile.value > 0;
                const Icon = iconMap[tile.label];
                
                return (
                    <div
                        key={index}
                        className="p-6 transition-all hover:shadow-lg group relative"
                        style={{
                            background: 'white',
                            borderRadius: '12px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                            border: '1px solid rgba(0,0,0,0.05)'
                        }}
                    >
                        {/* Header: Icon */}
                        <div className="flex items-start justify-between mb-6">
                            <div 
                                className="w-12 h-12 rounded-xl flex items-center justify-center"
                                style={{
                                    background: index === 0 ? '#EEF2FF' : index === 1 ? '#FEF3E2' : '#FFEBEE'
                                }}
                            >
                                {Icon && <Icon className="w-6 h-6" style={{ 
                                    color: index === 0 ? '#6366F1' : index === 1 ? '#F59E0B' : '#EF4444'
                                }} />}
                            </div>
                        </div>

                        {/* Main Value */}
                        <div
                            className="text-4xl font-bold mb-3 leading-none"
                            style={{
                                color: '#1F2937'
                            }}
                        >
                            {tile.value.toLocaleString()}
                        </div>

                        {/* Label */}
                        <div
                            className="font-semibold"
                            style={{
                                fontSize: '0.875rem',
                                color: '#6B7280'
                            }}
                        >
                            {tile.label}
                        </div>

                        {/* Subtitle if exists */}
                        {tile.subtitle && (
                            <div
                                className="mt-2 text-xs"
                                style={{
                                    color: '#9CA3AF'
                                }}
                            >
                                {tile.subtitle}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
