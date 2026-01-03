"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function GlobalContextBar() {
    const [labName, setLabName] = useState('Lab');
    const [currentDate, setCurrentDate] = useState('');
    const [currentTime, setCurrentTime] = useState('');

    useEffect(() => {
        const loadLabSettings = async () => {
            const { data } = await supabase
                .from('lab_settings')
                .select('lab_name')
                .single();

            if (data?.lab_name) {
                setLabName(data.lab_name);
            }
        };

        // Function to update date and time
        const updateDateTime = () => {
            const now = new Date();

            const dateStr = now.toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const timeStr = now.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });

            setCurrentDate(dateStr);
            setCurrentTime(timeStr);
        };

        // Initial update
        updateDateTime();

        // Update every second
        const interval = setInterval(updateDateTime, 1000);

        loadLabSettings();

        // Cleanup
        return () => clearInterval(interval);
    }, []);

    return (
        <div
            className="border-b px-6 py-3"
            style={{
                background: 'var(--color-surface)',
                borderColor: 'var(--color-border)'
            }}
        >
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div>
                        <span
                            className="uppercase tracking-wide"
                            style={{
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--color-text-tertiary)'
                            }}
                        >
                            Lab
                        </span>
                        <div
                            className="font-semibold"
                            style={{
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--color-text-primary)'
                            }}
                        >
                            {labName}
                        </div>
                    </div>
                </div>
                <div>
                    <span
                        className="uppercase tracking-wide block mb-1"
                        style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--color-text-tertiary)'
                        }}
                    >
                        Today
                    </span>
                    <div
                        className="font-semibold flex gap-3"
                        style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-text-primary)'
                        }}
                    >
                        <span className="tabular-nums">{currentTime}</span>
                        <span>{currentDate}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
