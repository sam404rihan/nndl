"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, Users, Activity, DollarSign } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ revenue: 0, patients: 0, orders: 0, avgTurnaround: 0 });
  const [revenueChart, setRevenueChart] = useState<any[]>([]);
  const [topTests, setTopTests] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  const checkAccessAndLoad = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        router.push('/dashboard'); // Kick out non-admins
        return;
      }

      // If admin, load analytics
      await loadAnalytics();
    } catch (error) {
      console.error('Error checking access:', error);
      router.push('/dashboard');
    }
  };

  const loadAnalytics = async () => {
    try {
      // Fetch total patients
      const { count: patientCount } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

      // ... rest of loadAnalytics logic ...

      // Fetch total orders
      const { count: orderCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      // Fetch total revenue (sum of all order totals - overall)
      const { data: revenueData } = await supabase
        .from('orders')
        .select('total_amount');

      const totalRevenue = revenueData?.reduce((sum, item: any) => {
        return sum + (item.total_amount || 0);
      }, 0) || 0;

      // Fetch average turnaround time (for all non-pending orders)
      const { data: tatData } = await supabase
        .from('orders')
        .select('created_at, updated_at')
        .in('status', ['in_process', 'completed', 'delivered'])
        .not('updated_at', 'is', null);

      let avgTAT = 0;
      if (tatData && tatData.length > 0) {
        const totalHours = tatData.reduce((sum, item) => {
          const created = new Date(item.created_at);
          const updated = new Date(item.updated_at);
          const hours = (updated.getTime() - created.getTime()) / (1000 * 60 * 60);
          // Only count positive hours (in case of data issues)
          return sum + (hours > 0 ? hours : 0);
        }, 0);
        avgTAT = totalHours > 0 ? Math.round((totalHours / tatData.length) * 10) / 10 : 0;
      }

      setKpis({
        revenue: totalRevenue,
        patients: patientCount || 0,
        orders: orderCount || 0,
        avgTurnaround: avgTAT
      });

      // Revenue trend by week (last 4 weeks)
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      const { data: weeklyRevenue } = await supabase
        .from('orders')
        .select('created_at, total_amount')
        .eq('status', 'delivered')
        .gte('created_at', fourWeeksAgo.toISOString());

      // Group by week
      const weeklyData: { [key: string]: number } = {};
      const now = Date.now();
      
      weeklyRevenue?.forEach((item: any) => {
        const date = new Date(item.created_at);
        const daysAgo = Math.floor((now - date.getTime()) / (24 * 60 * 60 * 1000));
        const weekIndex = Math.floor(daysAgo / 7);
        
        // Only include last 4 weeks (0-3)
        if (weekIndex < 4) {
          const weekLabel = `Week ${4 - weekIndex}`;
          
          if (!weeklyData[weekLabel]) {
            weeklyData[weekLabel] = 0;
          }
          weeklyData[weekLabel] += item.total_amount || 0;
        }
      });

      // Ensure all 4 weeks exist in order, even with 0 revenue
      const chartData = ['Week 1', 'Week 2', 'Week 3', 'Week 4'].map(week => ({
        date: week,
        revenue: weeklyData[week] || 0
      }));

      setRevenueChart(chartData);

      // Top 5 tests
      const { data: testCounts } = await supabase
        .from('order_tests')
        .select('test_id, tests(name)');

      const testCountMap: any = {};
      testCounts?.forEach((item: any) => {
        const testName = item.tests?.name || 'Unknown';
        testCountMap[testName] = (testCountMap[testName] || 0) + 1;
      });

      const topTestsData = Object.entries(testCountMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 5);

      setTopTests(topTestsData);

      // Order status distribution
      const { data: statusCounts } = await supabase
        .from('orders')
        .select('status');

      const statusMap: any = {};
      statusCounts?.forEach((item) => {
        const status = item.status || 'unknown';
        statusMap[status] = (statusMap[status] || 0) + 1;
      });

      const statusChartData = Object.entries(statusMap).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value
      }));

      setStatusData(statusChartData);

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        className="p-6"
        style={{
          background: 'var(--color-background)',
          minHeight: '100vh'
        }}
      >
        <div style={{ color: 'var(--color-text-disabled)' }}>Loading analytics...</div>
      </div>
    );
  }

  return (
    <div
      className="p-6"
      style={{
        background: 'var(--color-background)',
        minHeight: '100vh'
      }}
    >
      {/* Page Header */}
      <div className="mb-6">
        <h1
          className="text-3xl font-bold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Analytics Dashboard
        </h1>
        <p
          className="mt-1"
          style={{
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-sm)'
          }}
        >
          Performance metrics and insights
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Total Revenue"
          value={`$${kpis.revenue.toLocaleString()}`}
          icon={<DollarSign size={24} />}
          color="#10b981"
        />
        <KPICard
          title="Total Patients"
          value={kpis.patients}
          icon={<Users size={24} />}
          color="#3b82f6"
        />
        <KPICard
          title="Total Orders"
          value={kpis.orders}
          icon={<Activity size={24} />}
          color="#a855f7"
        />
        <KPICard
          title="Avg TAT (hours)"
          value={kpis.avgTurnaround}
          icon={<TrendingUp size={24} />}
          color="#f59e0b"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Revenue Trend */}
        <div
          className="border-2"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div
            className="border-b-2 px-6 py-3"
            style={{
              borderColor: 'var(--color-border)',
              background: 'var(--color-background)'
            }}
          >
            <h3
              className="font-bold uppercase tracking-wide"
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)'
              }}
            >
              Revenue Trend (Last 4 Weeks)
            </h3>
          </div>
          <div className="p-6">
            {revenueChart.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis
                      dataKey="date"
                      stroke="#718096"
                      fontSize={12}
                      style={{ fill: 'var(--color-text-tertiary)' }}
                    />
                    <YAxis
                      stroke="#718096"
                      fontSize={12}
                      style={{ fill: 'var(--color-text-tertiary)' }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        boxShadow: 'var(--shadow-md)'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#1e3a5f"
                      strokeWidth={3}
                      dot={{ fill: '#1e3a5f', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center" style={{ color: 'var(--color-text-disabled)' }}>
                No revenue data available
              </div>
            )}
          </div>
        </div>

        {/* Top Tests */}
        <div
          className="border-2"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div
            className="border-b-2 px-6 py-3"
            style={{
              borderColor: 'var(--color-border)',
              background: 'var(--color-background)'
            }}
          >
            <h3
              className="font-bold uppercase tracking-wide"
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)'
              }}
            >
              Top 5 Tests
            </h3>
          </div>
          <div className="p-6">
            {topTests.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topTests} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                    <XAxis type="number" stroke="#718096" fontSize={12} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={150}
                      stroke="#718096"
                      fontSize={12}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {topTests.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center" style={{ color: 'var(--color-text-disabled)' }}>
                No test data available
              </div>
            )}
          </div>
        </div>

        {/* Order Status */}
        <div
          className="border-2"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div
            className="border-b-2 px-6 py-3"
            style={{
              borderColor: 'var(--color-border)',
              background: 'var(--color-background)'
            }}
          >
            <h3
              className="font-bold uppercase tracking-wide"
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)'
              }}
            >
              Order Status Distribution
            </h3>
          </div>
          <div className="p-6">
            {statusData.length > 0 ? (
              <div className="h-80 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center" style={{ color: 'var(--color-text-disabled)' }}>
                No order data available
              </div>
            )}
          </div>
        </div>

        {/* System Health */}
        <div
          className="border-2"
          style={{
            background: 'var(--color-primary)',
            borderColor: 'var(--color-primary)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)',
            color: 'white'
          }}
        >
          <div
            className="border-b-2 px-6 py-3"
            style={{
              borderColor: 'rgba(255, 255, 255, 0.2)'
            }}
          >
            <h3
              className="font-bold uppercase tracking-wide"
              style={{
                fontSize: 'var(--font-size-sm)'
              }}
            >
              System Health
            </h3>
          </div>
          <div className="p-6">
            <p className="mb-6 opacity-80" style={{ fontSize: 'var(--font-size-sm)' }}>
              All systems operational. Database connections secure.
            </p>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                <span style={{ fontSize: 'var(--font-size-sm)' }}>Total Patients</span>
                <span className="font-mono text-green-300">{kpis.patients}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                <span style={{ fontSize: 'var(--font-size-sm)' }}>Total Orders</span>
                <span className="font-mono text-blue-200">{kpis.orders}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                <span style={{ fontSize: 'var(--font-size-sm)' }}>Avg TAT</span>
                <span className="font-mono opacity-90">{kpis.avgTurnaround}h</span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ fontSize: 'var(--font-size-sm)' }}>Revenue</span>
                <span className="font-mono text-green-300">${kpis.revenue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// KPI Card Component
function KPICard({ title, value, icon, color }: any) {
  return (
    <div
      className="border-2 p-6"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p
            className="uppercase font-semibold tracking-wide mb-2"
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-tertiary)'
            }}
          >
            {title}
          </p>
          <p
            className="text-3xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {value}
          </p>
        </div>
        <div
          className="p-3 rounded-full"
          style={{
            background: 'var(--color-background)',
            color: color
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
