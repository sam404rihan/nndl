"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell, MessageSquare, Settings } from 'lucide-react';

export default function GlobalContextBar() {
    const [labName, setLabName] = useState('Lab');
    const [userName, setUserName] = useState('User');
    const [currentDate, setCurrentDate] = useState('');
    const [currentTime, setCurrentTime] = useState('');

    useEffect(() => {
        const loadUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (user) {
                // Get user profile for name
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, email')
                    .eq('id', user.id)
                    .single();
                
                if (profile?.full_name) {
                    setUserName(profile.full_name.split(' ')[0]); // First name only
                } else if (user.email) {
                    setUserName(user.email.split('@')[0]);
                }
            }

            // Get lab settings
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

        loadUserData();

        // Cleanup
        return () => clearInterval(interval);
    }, []);

    return (
        <div
            className="border-b sticky top-0 z-10 backdrop-blur-sm"
            style={{
                background: 'rgba(255, 255, 255, 0.98)',
                borderColor: 'var(--color-border-subtle)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
            }}
        >
            <div className="max-w-7xl mx-auto px-6 py-5">
                <div className="flex items-center justify-between">
                    {/* Left: Personalized Welcome */}
                    <div>
                        <h1 
                            className="font-bold mb-1"
                            style={{
                                fontSize: '1.5rem',
                                color: 'var(--color-text-primary)',
                                letterSpacing: '-0.025em'
                            }}
                        >
                            Welcome back, {userName}
                        </h1>
                        <p 
                            className="font-medium"
                            style={{
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--color-text-tertiary)'
                            }}
                        >
                            Track, manage and forecast your patient reports and data.
                        </p>
                    </div>

                    {/* Right: Action Icons */}
                    <div className="flex items-center gap-3">
                        {/* Icons removed */}
                    </div>
                </div>
            </div>
        </div>
    );
}
