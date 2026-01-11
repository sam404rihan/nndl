import { supabase } from './supabase';

/**
 * TAT (Turnaround Time) Utility Functions
 * For NNDL Lab - Clinical laboratory operations
 */

// Standard TAT categories for clinical lab tests
export const TAT_CATEGORIES = {
    ROUTINE: 24, // 24 hours - CBC, Lipid Profile, etc.
    URGENT: 4,   // 4 hours - Critical tests
    STAT: 1,     // 1 hour - Emergency tests
    CULTURE: 72, // 72 hours - Bacterial cultures
    SPECIAL: 48, // 48 hours - Special tests
} as const;

// Default TAT if test doesn't have specific TAT defined
export const DEFAULT_TAT_HOURS = 24;

/**
 * Get hours elapsed since order creation
 */
export function getHoursPending(createdAt: string | Date): number {
    const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
    return Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60));
}

/**
 * Check if order is delayed based on TAT
 */
export function isDelayed(createdAt: string | Date, tatHours: number): boolean {
    return getHoursPending(createdAt) > tatHours;
}

/**
 * Get hours remaining until TAT deadline
 * Returns negative if already delayed
 */
export function getHoursRemaining(createdAt: string | Date, tatHours: number): number {
    const pending = getHoursPending(createdAt);
    return tatHours - pending;
}

/**
 * Format TAT display for UI
 * Examples: "12h / 24h", "48h / 24h ⚠️"
 */
export function formatTATDisplay(hoursPending: number, tatHours: number): string {
    const delayed = hoursPending > tatHours;
    return delayed
        ? `${hoursPending}h / ${tatHours}h ⚠️`
        : `${hoursPending}h / ${tatHours}h`;
}

/**
 * Get severity level based on TAT breach
 */
export function getTATSeverity(hoursPending: number, tatHours: number): 'critical' | 'warning' | 'ok' {
    const percentOver = ((hoursPending - tatHours) / tatHours) * 100;

    if (percentOver > 100) return 'critical'; // More than 2x TAT
    if (percentOver > 0) return 'warning';    // Exceeded TAT
    return 'ok';
}

/**
 * Get TAT for a specific test
 * Falls back to DEFAULT_TAT_HOURS if test doesn't have TAT defined
 */
export async function getTestTAT(testId: string): Promise<number> {
    const { data } = await supabase
        .from('tests')
        .select('tat_hours')
        .eq('id', testId)
        .single();

    return data?.tat_hours || DEFAULT_TAT_HOURS;
}

/**
 * Get default TAT from lab settings
 */
export async function getDefaultTAT(): Promise<number> {
    const { data } = await supabase
        .from('lab_settings')
        .select('default_tat_hours')
        .single();

    return data?.default_tat_hours || DEFAULT_TAT_HOURS;
}

/**
 * Format time remaining in human-readable format
 */
export function formatTimeRemaining(hoursRemaining: number): string {
    if (hoursRemaining < 0) {
        return `${Math.abs(hoursRemaining)}h overdue`;
    }

    if (hoursRemaining < 1) {
        const minutes = Math.floor(hoursRemaining * 60);
        return `${minutes}m remaining`;
    }

    return `${hoursRemaining}h remaining`;
}
