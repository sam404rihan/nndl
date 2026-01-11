"use client";

import GlobalContextBar from '@/components/dashboard/GlobalContextBar';
import PrimaryKPITiles from '@/components/dashboard/PrimaryKPITiles';
import OperationalStatus from '@/components/dashboard/OperationalStatus';
import ExceptionsPanel from '@/components/dashboard/ExceptionsPanel';
import RevenueSnapshot from '@/components/dashboard/RevenueSnapshot';

export default function DashboardHome() {
  return (
    <div className="min-h-screen" style={{ background: '#F8F9FB' }}>
      {/* Global Context Bar with Welcome Message */}
      <GlobalContextBar />

      {/* Main Dashboard Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* Primary KPI Tiles - 3 column grid */}
        <section>
          <PrimaryKPITiles />
        </section>

        {/* Middle Section - Charts and Status */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <OperationalStatus />
          <ExceptionsPanel />
        </section>

        {/* Bottom Section - Revenue */}
        <section>
          <RevenueSnapshot />
        </section>
      </div>
    </div>
  );
}