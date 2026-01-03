"use client";

import GlobalContextBar from '@/components/dashboard/GlobalContextBar';
import PrimaryKPITiles from '@/components/dashboard/PrimaryKPITiles';
import OperationalStatus from '@/components/dashboard/OperationalStatus';
import ExceptionsPanel from '@/components/dashboard/ExceptionsPanel';
import RevenueSnapshot from '@/components/dashboard/RevenueSnapshot';

export default function DashboardHome() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      {/* 1. Global Context Bar - Always visible at top */}
      <GlobalContextBar />

      {/* Main Dashboard Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* 2. Primary KPI Tiles - Critical metrics */}
        <section>
          <PrimaryKPITiles />
        </section>

        {/* 3. Operational Status & 4. Exceptions - Side by side */}
        <section className="grid grid-cols-2 gap-6">
          <OperationalStatus />
          <div>
            <ExceptionsPanel />
          </div>
        </section>

        {/* 5. Revenue Snapshot */}
        <section>
          <RevenueSnapshot />
        </section>
      </div>
    </div>
  );
}