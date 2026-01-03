/**
 * Delta Tracking Utilities
 * For showing ▲/▼ trend indicators vs yesterday
 */

const STORAGE_KEY = 'dashboard_metrics_yesterday';

export interface Delta {
    value: number;
    direction: 'up' | 'down' | 'same';
    percentage?: number;
}

export interface DashboardMetrics {
    totalTestsToday: number;
    samplesInProcess: number;
    reportsPendingApproval: number;
    reportsDeliveredToday: number;
    delayedReports: number;
    oldestPendingHours: number;
    timestamp: string;
}

/**
 * Store today's metrics for tomorrow's comparison
 */
export function storeMetrics(metrics: DashboardMetrics): void {
    if (typeof window === 'undefined') return;

    const data = {
        ...metrics,
        timestamp: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Get yesterday's metrics
 */
export function getYesterdayMetrics(): DashboardMetrics | null {
    if (typeof window === 'undefined') return null;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    try {
        const data = JSON.parse(stored);
        const storedDate = new Date(data.timestamp);
        const now = new Date();

        // Only use if it's from yesterday (within 24-48 hours ago)
        const hoursDiff = (now.getTime() - storedDate.getTime()) / (1000 * 60 * 60);
        if (hoursDiff >= 20 && hoursDiff <= 48) {
            return data;
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * Calculate delta between today and yesterday
 */
export function calculateDelta(today: number, yesterday: number): Delta {
    const diff = today - yesterday;

    if (diff === 0) {
        return { value: 0, direction: 'same' };
    }

    const percentage = yesterday !== 0 ? Math.round((diff / yesterday) * 100) : 0;

    return {
        value: Math.abs(diff),
        direction: diff > 0 ? 'up' : 'down',
        percentage,
    };
}

/**
 * Format delta for display
 */
export function formatDelta(delta: Delta, isGoodWhenUp: boolean = true): string {
    if (delta.direction === 'same') return '—';

    const sign = delta.direction === 'up' ? '+' : '-';
    return `${sign}${delta.value}`;
}

/**
 * Get delta color class based on context
 */
export function getDeltaColor(delta: Delta, isGoodWhenUp: boolean = true): string {
    if (delta.direction === 'same') return 'text-slate-500';

    const isPositive = isGoodWhenUp ? delta.direction === 'up' : delta.direction === 'down';
    return isPositive ? 'text-green-600' : 'text-red-600';
}

/**
 * Get delta icon (▲ or ▼)
 */
export function getDeltaIcon(delta: Delta): string {
    if (delta.direction === 'same') return '—';
    return delta.direction === 'up' ? '▲' : '▼';
}
