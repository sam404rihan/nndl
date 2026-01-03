import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main Scrollable Content Area */}
      <main className="flex-1 overflow-y-auto">
        {/* You can add a top header here if needed later */}
        <div className="min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}