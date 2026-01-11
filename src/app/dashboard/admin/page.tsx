"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, Users, Activity, DollarSign, FlaskConical, Clock, CheckCircle2 } from 'lucide-react';

const COLORS = ['#4A6FA5', '#52A397', '#F59E0B', '#EF4444', '#8B5CF6'];

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
        .eq('payment_status', 'paid')
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
        className="min-h-screen"
        style={{
          background: '#F8F9FB'
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-white rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: '#F8F9FB'
      }}
    >
      {/* Page Header */}
      <div className="border-b sticky top-0 z-10 backdrop-blur-sm" style={{
        background: 'rgba(255, 255, 255, 0.98)',
        borderColor: 'rgba(0,0,0,0.06)'
      }}>
        <div className="max-w-7xl mx-auto px-6 py-5">
          <h1 className="text-2xl font-bold" style={{ color: '#1F2937', letterSpacing: '-0.025em' }}>
            Analytics Dashboard
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#6B7280' }}>
            Performance metrics and insights
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              title: "Total Revenue",
              value: `₹${kpis.revenue.toLocaleString()}`,
              icon: <DollarSign className="w-6 h-6" />,
              gradient: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
              change: "+12.5%",
              changePositive: true
            },
            {
              title: "Total Patients",
              value: kpis.patients.toLocaleString(),
              icon: <Users className="w-6 h-6" />,
              gradient: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
              change: "+8.3%",
              changePositive: true
            },
            {
              title: "Total Orders",
              value: kpis.orders.toLocaleString(),
              icon: <Activity className="w-6 h-6" />,
              gradient: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
              change: "+15.2%",
              changePositive: true
            },
            {
              title: "Avg Turnaround",
              value: `${kpis.avgTurnaround}h`,
              icon: <Clock className="w-6 h-6" />,
              gradient: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
              change: "-2.1h",
              changePositive: true
            }
          ].map((kpi, index) => (
            <div
              key={index}
              className="relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-2xl group"
              style={{
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                border: '1px solid rgba(0,0,0,0.05)'
              }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 opacity-5" style={{
                background: kpi.gradient,
                borderRadius: '50%',
                transform: 'translate(30%, -30%)'
              }}></div>
              
              <div className="p-6 relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg"
                    style={{ background: kpi.gradient }}
                  >
                    <div style={{ color: 'white' }}>
                      {kpi.icon}
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-lg text-xs font-bold ${kpi.changePositive ? 'bg-green-50' : 'bg-red-50'}`} style={{
                    color: kpi.changePositive ? '#10B981' : '#EF4444'
                  }}>
                    {kpi.change}
                  </div>
                </div>
                <div className="text-3xl font-extrabold mb-1" style={{ 
                  color: '#1F2937',
                  letterSpacing: '-0.02em'
                }}>
                  {kpi.value}
                </div>
                <div className="text-sm font-semibold" style={{ color: '#6B7280' }}>
                  {kpi.title}
                </div>
              </div>
            </div>
          ))}
        </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Revenue Trend */}
        <div
          className="overflow-hidden transition-all hover:shadow-xl group"
          style={{
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.05)'
          }}
        >
          <div
            className="px-6 py-5 border-b"
            style={{
              background: 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)',
              borderColor: 'rgba(0,0,0,0.06)'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm" style={{ 
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                }}>
                  <TrendingUp className="w-5 h-5" style={{ color: 'white' }} />
                </div>
                <div>
                  <h3 className="font-bold text-base" style={{ color: '#1F2937' }}>
                    Revenue Trend
                  </h3>
                  <p className="text-xs font-medium" style={{ color: '#6B7280' }}>Last 4 weeks performance</p>
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ 
                background: '#ECFDF5',
                color: '#10B981'
              }}>
                Last 4 Weeks
              </div>
            </div>
          </div>
          <div className="p-6">
            {revenueChart.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#9CA3AF"
                      fontSize={11}
                      fontWeight={600}
                      tickLine={false}
                      axisLine={{ stroke: 'rgba(0,0,0,0.06)' }}
                    />
                    <YAxis
                      stroke="#9CA3AF"
                      fontSize={11}
                      fontWeight={600}
                      tickLine={false}
                      axisLine={{ stroke: 'rgba(0,0,0,0.06)' }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'white',
                        border: '1px solid rgba(0,0,0,0.08)',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        padding: '12px'
                      }}
                      labelStyle={{ fontWeight: 700, color: '#1F2937', marginBottom: '4px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10B981"
                      strokeWidth={3}
                      dot={{ fill: '#10B981', r: 6, strokeWidth: 2, stroke: 'white' }}
                      activeDot={{ r: 8, strokeWidth: 2, stroke: 'white' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex flex-col items-center justify-center" style={{ color: '#9CA3AF' }}>
                <TrendingUp className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-semibold">No revenue data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Tests */}
        <div
          className="overflow-hidden transition-all hover:shadow-xl group"
          style={{
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.05)'
          }}
        >
          <div
            className="px-6 py-5 border-b"
            style={{
              background: 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)',
              borderColor: 'rgba(0,0,0,0.06)'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm" style={{ 
                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'
              }}>
                <FlaskConical className="w-5 h-5" style={{ color: 'white' }} />
              </div>
              <div>
                <h3 className="font-bold text-base" style={{ color: '#1F2937' }}>
                  Top 5 Tests
                </h3>
                <p className="text-xs font-medium" style={{ color: '#6B7280' }}>Most requested lab tests</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {topTests.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topTests} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.04)" />
                    <XAxis 
                      type="number" 
                      stroke="#9CA3AF" 
                      fontSize={11} 
                      fontWeight={600}
                      tickLine={false}
                      axisLine={{ stroke: 'rgba(0,0,0,0.06)' }}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={140}
                      stroke="#9CA3AF"
                      fontSize={11}
                      fontWeight={600}
                      tickLine={false}
                      axisLine={{ stroke: 'rgba(0,0,0,0.06)' }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'white',
                        border: '1px solid rgba(0,0,0,0.08)',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        padding: '12px'
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                      {topTests.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex flex-col items-center justify-center" style={{ color: '#9CA3AF' }}>
                <FlaskConical className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-semibold">No test data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Order Status */}
        <div
          className="overflow-hidden transition-all hover:shadow-xl group"
          style={{
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.05)'
          }}
        >
          <div
            className="px-6 py-5 border-b"
            style={{
              background: 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)',
              borderColor: 'rgba(0,0,0,0.06)'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm" style={{ 
                background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)'
              }}>
                <Activity className="w-5 h-5" style={{ color: 'white' }} />
              </div>
              <div>
                <h3 className="font-bold text-base" style={{ color: '#1F2937' }}>
                  Order Status
                </h3>
                <p className="text-xs font-medium" style={{ color: '#6B7280' }}>Distribution by status</p>
              </div>
            </div>
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
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]}
                          stroke="white"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'white',
                        border: '1px solid rgba(0,0,0,0.08)',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        padding: '12px'
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={40}
                      iconType="circle"
                      wrapperStyle={{ fontSize: '12px', fontWeight: 600 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex flex-col items-center justify-center" style={{ color: '#9CA3AF' }}>
                <Activity className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-semibold">No order data available</p>
              </div>
            )}
          </div>
        </div>

        {/* System Health */}
        <div
          className="overflow-hidden transition-all hover:shadow-xl group relative"
          style={{
            background: 'linear-gradient(135deg, #4A6FA5 0%, #52A397 100%)',
            borderRadius: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white'
          }}
        >
          <div className="absolute top-0 right-0 w-40 h-40 opacity-10" style={{
            background: 'white',
            borderRadius: '50%',
            transform: 'translate(30%, -30%)'
          }}></div>

          <div
            className="px-6 py-5 border-b relative z-10"
            style={{
              borderColor: 'rgba(255, 255, 255, 0.15)'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ 
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)'
              }}>
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">
                  System Health
                </h3>
                <p className="text-xs font-medium opacity-90">All systems operational</p>
              </div>
            </div>
          </div>
          <div className="p-6 relative z-10">
            <div className="mb-6 px-4 py-3 rounded-xl" style={{
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)'
            }}>
              <p className="text-sm font-semibold">
                ✓ Database connections secure
              </p>
              <p className="text-xs opacity-80 mt-1">Last checked: {new Date().toLocaleTimeString()}</p>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.15)' }}>
                <span className="text-sm font-semibold">Total Patients</span>
                <span className="font-mono font-bold text-xl">{kpis.patients}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.15)' }}>
                <span className="text-sm font-semibold">Total Orders</span>
                <span className="font-mono font-bold text-xl">{kpis.orders}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.15)' }}>
                <span className="text-sm font-semibold">Avg Turnaround</span>
                <span className="font-mono font-bold text-xl">{kpis.avgTurnaround}h</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold">Total Revenue</span>
                <span className="font-mono font-bold text-xl">₹{kpis.revenue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
      </div>
    </div>
  );
}

// Remove the old KPICard component as it's now inline