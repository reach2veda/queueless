import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
  Users,
  Building2,
  RefreshCw,
  Filter,
  ArrowUpRight,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  Layers,
  Sparkles,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import DashboardSidebar from '../../components/layout/DashboardSidebar';
import DashboardNavbar from '../../components/layout/DashboardNavbar';
import Button from '../../components/ui/Button';
import api from '../../services/api';

const STATUS_COLORS = {
  completed: '#16834A',
  confirmed: '#0284C7',
  in_progress: '#0D9488',
  pending: '#F59E0B',
  cancelled: '#E11D48',
  no_show: '#8B5CF6',
};

export default function ProviderAnalyticsPage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Timeframe and Granularity States
  const [timeframe, setTimeframe] = useState('all'); // 'all' | '30days' | '7days' | '90days' | '12months' | 'custom'
  const [granularity, setGranularity] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Chart Metric Toggle: 'volume' | 'revenue'
  const [chartMetric, setChartMetric] = useState('volume');

  // Data States
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch Analytics from Backend
  const fetchAnalytics = useCallback(
    async (isManual = false) => {
      if (isManual) setIsRefreshing(true);
      setErrorMessage('');

      try {
        const params = new URLSearchParams();
        params.append('timeframe', timeframe);
        params.append('granularity', granularity);

        if (timeframe === 'custom' && customStartDate && customEndDate) {
          params.append('startDate', customStartDate);
          params.append('endDate', customEndDate);
        }

        const res = await api.get(`/analytics/provider?${params.toString()}`);
        if (res.data?.success) {
          setAnalyticsData(res.data);
        } else {
          setErrorMessage('Could not load analytics from server');
        }
      } catch (err) {
        console.error('Failed to load provider analytics:', err);
        const msg =
          err.response?.data?.error?.message ||
          err.message ||
          'Failed to load analytics records for your business';
        setErrorMessage(msg);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [timeframe, granularity, customStartDate, customEndDate]
  );

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const overview = analyticsData?.overview || {
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    confirmedAppointments: 0,
    pendingAppointments: 0,
    inProgressAppointments: 0,
    pendingAndConfirmed: 0,
    totalRevenue: 0,
    completionRate: 0,
    cancellationRate: 0,
    averageRevenuePerCompleted: 0,
  };

  const trends = analyticsData?.trends || [];
  const popularServices = analyticsData?.popularServices || [];
  const statusDistribution = (analyticsData?.statusDistribution || []).filter((s) => s.count > 0);
  const staffPerformance = analyticsData?.staffPerformance || [];
  const business = analyticsData?.business;

  // Custom Tooltip for Trend AreaChart
  const CustomTrendTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3.5 rounded-2xl border border-[#E3EAE5] shadow-card text-xs space-y-1.5 min-w-[170px]">
          <p className="font-extrabold text-[#17231C] border-b border-[#E3EAE5] pb-1">
            {data.label || label}
          </p>
          <div className="flex justify-between space-x-3">
            <span className="text-[#66736B]">Total Bookings:</span>
            <span className="font-extrabold text-[#17231C]">{data.total}</span>
          </div>
          <div className="flex justify-between space-x-3 text-[#16834A]">
            <span>Completed Visits:</span>
            <span className="font-bold">{data.completed}</span>
          </div>
          <div className="flex justify-between space-x-3 text-rose-600">
            <span>Cancelled:</span>
            <span className="font-bold">{data.cancelled}</span>
          </div>
          <div className="flex justify-between space-x-3 pt-1 border-t border-[#E3EAE5] font-extrabold text-[#11643A]">
            <span>Earned Revenue:</span>
            <span>${(data.revenue || 0).toFixed(2)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#F3FAF5] flex">
      {/* Sidebar */}
      <DashboardSidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardNavbar title="Business Analytics" toggleSidebar={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Header Banner */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#16834A] bg-[#EAF6EE] px-2.5 py-1 rounded-full">
                  Business Performance Intelligence
                </span>
                {business?.name && (
                  <span className="text-xs font-semibold text-[#66736B] flex items-center space-x-1">
                    <Building2 className="w-3.5 h-3.5 text-[#16834A]" />
                    <span>{business.name}</span>
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-extrabold text-[#17231C]">
                Analytics & Revenue Reports
              </h2>

              <p className="text-xs sm:text-sm text-[#66736B]">
                Track completed appointment revenue, service utilization rates, and operational throughput.
              </p>
            </div>

            <div className="flex items-center space-x-2.5 self-start lg:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchAnalytics(true)}
                isLoading={isRefreshing}
                leftIcon={<RefreshCw className="w-4 h-4 text-[#16834A]" />}
              >
                Refresh Data
              </Button>
            </div>
          </div>

          {/* Timeframe and Granularity Controls Bar */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E3EAE5] shadow-card space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Timeframe Presets */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-[#66736B] mr-1 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Timeframe:</span>
                </span>

                {[
                  { id: 'all', label: 'All Time' },
                  { id: '30days', label: 'Last 30 Days' },
                  { id: '7days', label: 'Last 7 Days' },
                  { id: '90days', label: 'Last 90 Days' },
                  { id: '12months', label: 'Past 12 Months' },
                  { id: 'custom', label: 'Custom Range' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setTimeframe(preset.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      timeframe === preset.id
                        ? 'bg-[#16834A] text-white shadow-sm'
                        : 'bg-[#F3FAF5] text-[#66736B] hover:text-[#17231C] border border-[#E3EAE5]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Granularity Toggle */}
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-[#66736B]">Granularity:</span>
                <div className="bg-[#F3FAF5] p-1 rounded-2xl border border-[#E3EAE5] flex items-center">
                  {[
                    { id: 'daily', label: 'Daily' },
                    { id: 'weekly', label: 'Weekly' },
                    { id: 'monthly', label: 'Monthly' },
                  ].map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setGranularity(g.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        granularity === g.id
                          ? 'bg-white text-[#11643A] shadow-sm'
                          : 'text-[#66736B] hover:text-[#17231C]'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom Date Range Picker Fields */}
            {timeframe === 'custom' && (
              <div className="pt-3 border-t border-[#E3EAE5] flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-[#17231C]">Select Custom Date Window:</span>
                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-[#E3EAE5] text-xs font-medium bg-white text-[#17231C] focus:outline-none focus:ring-2 focus:ring-[#16834A]/20"
                  />
                  <span className="text-xs text-[#66736B]">to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-[#E3EAE5] text-xs font-medium bg-white text-[#17231C] focus:outline-none focus:ring-2 focus:ring-[#16834A]/20"
                  />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => fetchAnalytics(true)}
                  disabled={!customStartDate || !customEndDate}
                >
                  Apply Date Filter
                </Button>
              </div>
            )}
          </div>

          {/* KPI Metrics Summary Cards */}
          {errorMessage ? (
            <div className="bg-white rounded-3xl p-8 border border-red-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-base text-[#17231C]">Analytics Failed to Load</h4>
              <p className="text-xs text-[#66736B] max-w-md mx-auto">{errorMessage}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchAnalytics(true)}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Retry
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Total Appointments */}
                <div className="bg-white rounded-3xl p-5 border border-[#E3EAE5] shadow-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#66736B]">Total Bookings</span>
                    <span className="p-2 rounded-xl bg-[#EAF6EE] text-[#16834A]">
                      <Calendar className="w-4 h-4" />
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-[#17231C]">
                      {overview.totalAppointments}
                    </h3>
                    <p className="text-[11px] text-[#66736B] mt-0.5">
                      Completion rate:{' '}
                      <strong className="text-[#16834A]">{overview.completionRate}%</strong>
                    </p>
                  </div>
                </div>

                {/* Total Earned Revenue */}
                <div className="bg-white rounded-3xl p-5 border border-[#16834A]/30 shadow-card space-y-2 bg-gradient-to-br from-white to-[#F3FAF5]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#11643A]">Total Revenue</span>
                    <span className="p-2 rounded-xl bg-[#16834A] text-white shadow-sm">
                      <DollarSign className="w-4 h-4" />
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-[#11643A]">
                      ${overview.totalRevenue.toFixed(2)}
                    </h3>
                    <p className="text-[11px] text-[#66736B] mt-0.5 flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3 text-[#16834A]" />
                      <span>Completed visits only</span>
                    </p>
                  </div>
                </div>

                {/* Completed Appointments */}
                <div className="bg-white rounded-3xl p-5 border border-[#E3EAE5] shadow-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#66736B]">Completed Visits</span>
                    <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-emerald-800">
                      {overview.completedAppointments}
                    </h3>
                    <p className="text-[11px] text-[#66736B] mt-0.5">
                      Avg ticket: ${overview.averageRevenuePerCompleted.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Pending & Confirmed */}
                <div className="bg-white rounded-3xl p-5 border border-[#E3EAE5] shadow-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#66736B]">Awaiting Service</span>
                    <span className="p-2 rounded-xl bg-blue-50 text-blue-700">
                      <Clock className="w-4 h-4" />
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-blue-800">
                      {overview.pendingAndConfirmed}
                    </h3>
                    <p className="text-[11px] text-[#66736B] mt-0.5">
                      {overview.inProgressAppointments} in queue • {overview.confirmedAppointments} confirmed
                    </p>
                  </div>
                </div>

                {/* Cancelled Appointments */}
                <div className="bg-white rounded-3xl p-5 border border-[#E3EAE5] shadow-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#66736B]">Cancelled</span>
                    <span className="p-2 rounded-xl bg-rose-50 text-rose-700">
                      <XCircle className="w-4 h-4" />
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-rose-700">
                      {overview.cancelledAppointments}
                    </h3>
                    <p className="text-[11px] text-[#66736B] mt-0.5">
                      Cancellation rate:{' '}
                      <strong className="text-rose-600">{overview.cancellationRate}%</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Main Trend Chart Section */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E3EAE5]">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-[#16834A]" />
                      <h3 className="font-extrabold text-base text-[#17231C]">
                        Appointment Volume & Revenue Trend
                      </h3>
                    </div>
                    <p className="text-xs text-[#66736B]">
                      Historical throughput grouped by {granularity} intervals
                    </p>
                  </div>

                  {/* Toggle Metric View */}
                  <div className="bg-[#F3FAF5] p-1 rounded-2xl border border-[#E3EAE5] flex items-center self-start sm:self-center">
                    <button
                      onClick={() => setChartMetric('volume')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        chartMetric === 'volume'
                          ? 'bg-white text-[#11643A] shadow-sm'
                          : 'text-[#66736B] hover:text-[#17231C]'
                      }`}
                    >
                      Volume (Bookings)
                    </button>
                    <button
                      onClick={() => setChartMetric('revenue')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        chartMetric === 'revenue'
                          ? 'bg-white text-[#11643A] shadow-sm'
                          : 'text-[#66736B] hover:text-[#17231C]'
                      }`}
                    >
                      Earned Revenue ($)
                    </button>
                  </div>
                </div>

                {trends.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-[#EAF6EE] text-[#16834A] flex items-center justify-center mx-auto">
                      <BarChart3 className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-sm text-[#17231C]">No Trend Data Available</h4>
                    <p className="text-xs text-[#66736B] max-w-sm mx-auto">
                      No appointment records were found for the selected timeframe. Try selecting "All Time" or adjusting the date filter.
                    </p>
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartMetric === 'volume' ? (
                        <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="totalColor" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0284C7" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#0284C7" stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="completedColor" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#16834A" stopOpacity={0.5} />
                              <stop offset="95%" stopColor="#16834A" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E3EAE5" vertical={false} />
                          <XAxis
                            dataKey="label"
                            stroke="#66736B"
                            fontSize={11}
                            tickLine={false}
                            axisLine={{ stroke: '#E3EAE5' }}
                          />
                          <YAxis
                            stroke="#66736B"
                            fontSize={11}
                            tickLine={false}
                            axisLine={{ stroke: '#E3EAE5' }}
                            allowDecimals={false}
                          />
                          <Tooltip content={<CustomTrendTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="total"
                            name="Total Booked"
                            stroke="#0284C7"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#totalColor)"
                          />
                          <Area
                            type="monotone"
                            dataKey="completed"
                            name="Completed Visits"
                            stroke="#16834A"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#completedColor)"
                          />
                        </AreaChart>
                      ) : (
                        <AreaChart data={trends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="revenueColor" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#16834A" stopOpacity={0.6} />
                              <stop offset="95%" stopColor="#16834A" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E3EAE5" vertical={false} />
                          <XAxis
                            dataKey="label"
                            stroke="#66736B"
                            fontSize={11}
                            tickLine={false}
                            axisLine={{ stroke: '#E3EAE5' }}
                          />
                          <YAxis
                            stroke="#66736B"
                            fontSize={11}
                            tickLine={false}
                            axisLine={{ stroke: '#E3EAE5' }}
                            tickFormatter={(val) => `$${val}`}
                          />
                          <Tooltip content={<CustomTrendTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            name="Earned Revenue ($)"
                            stroke="#11643A"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#revenueColor)"
                          />
                        </AreaChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Two Column Grid: Popular Services & Status Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Popular Services Chart & Table */}
                <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E3EAE5] shadow-card space-y-4 flex flex-col justify-between">
                  <div className="space-y-1 pb-3 border-b border-[#E3EAE5]">
                    <div className="flex items-center space-x-2">
                      <Layers className="w-4 h-4 text-[#16834A]" />
                      <h3 className="font-extrabold text-base text-[#17231C]">
                        Most Popular Services
                      </h3>
                    </div>
                    <p className="text-xs text-[#66736B]">
                      Services ranked by total appointment booking count
                    </p>
                  </div>

                  {popularServices.length === 0 ? (
                    <div className="py-12 text-center text-xs text-[#66736B]">
                      No service bookings recorded in this timeframe.
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {popularServices.map((srv, idx) => (
                        <div
                          key={srv.serviceId}
                          className="p-3.5 rounded-2xl bg-[#F3FAF5] border border-[#E3EAE5] space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-2">
                              <span className="w-5 h-5 rounded-full bg-[#16834A] text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                                #{idx + 1}
                              </span>
                              <span className="font-extrabold text-[#17231C] truncate max-w-[200px]">
                                {srv.name}
                              </span>
                            </div>
                            <span className="font-mono font-bold text-[#11643A]">
                              ${srv.revenue.toFixed(2)} earned
                            </span>
                          </div>

                          {/* Progress bar of booking share */}
                          <div className="space-y-1">
                            <div className="w-full bg-[#E3EAE5] h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-[#16834A] h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, srv.sharePercentage)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[11px] text-[#66736B]">
                              <span>{srv.totalBookings} total bookings ({srv.completedBookings} completed)</span>
                              <span className="font-semibold text-[#16834A]">{srv.sharePercentage}% share</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Appointment Status Distribution (Donut Chart) */}
                <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E3EAE5] shadow-card space-y-4 flex flex-col justify-between">
                  <div className="space-y-1 pb-3 border-b border-[#E3EAE5]">
                    <div className="flex items-center space-x-2">
                      <PieChartIcon className="w-4 h-4 text-[#16834A]" />
                      <h3 className="font-extrabold text-base text-[#17231C]">
                        Appointment Status Distribution
                      </h3>
                    </div>
                    <p className="text-xs text-[#66736B]">
                      Proportion of completed, in-progress, and cancelled visits
                    </p>
                  </div>

                  {statusDistribution.length === 0 ? (
                    <div className="py-12 text-center text-xs text-[#66736B]">
                      No status distribution data available for this range.
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
                      {/* Donut Chart */}
                      <div className="h-44 w-44 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={statusDistribution}
                              dataKey="count"
                              nameKey="label"
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={70}
                              paddingAngle={3}
                            >
                              {statusDistribution.map((entry) => (
                                <Cell
                                  key={`cell-${entry.status}`}
                                  fill={STATUS_COLORS[entry.status] || '#16834A'}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value, name) => [`${value} bookings`, name]}
                              contentStyle={{
                                borderRadius: '12px',
                                border: '1px solid #E3EAE5',
                                fontSize: '11px',
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Legend List */}
                      <div className="flex-1 space-y-2 w-full">
                        {statusDistribution.map((item) => (
                          <div
                            key={item.status}
                            className="flex items-center justify-between text-xs p-2 rounded-xl bg-[#F3FAF5] border border-[#E3EAE5]"
                          >
                            <div className="flex items-center space-x-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: STATUS_COLORS[item.status] || '#16834A' }}
                              />
                              <span className="font-semibold text-[#17231C]">{item.label}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-[#17231C]">
                                {item.count}
                              </span>
                              <span className="text-[11px] text-[#66736B]">
                                ({item.percentage}%)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Staff Performance Leaderboard Table */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E3EAE5]">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-[#16834A]" />
                      <h3 className="font-extrabold text-base text-[#17231C]">
                        Staff Practitioner Performance
                      </h3>
                    </div>
                    <p className="text-xs text-[#66736B]">
                      Workload throughput and completion metrics per practitioner
                    </p>
                  </div>

                  <span className="text-xs font-bold text-[#16834A] bg-[#EAF6EE] px-2.5 py-1 rounded-full">
                    {staffPerformance.length} practitioner{staffPerformance.length === 1 ? '' : 's'}
                  </span>
                </div>

                {staffPerformance.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#66736B]">
                    No staff assignment records available for this business yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#E3EAE5] text-[#66736B] font-bold">
                          <th className="pb-3 pl-2">Practitioner / Role</th>
                          <th className="pb-3 text-center">Total Assigned</th>
                          <th className="pb-3 text-center">Completed</th>
                          <th className="pb-3 text-center">Cancelled</th>
                          <th className="pb-3 text-center">Completion Rate</th>
                          <th className="pb-3 pr-2 text-right">Earned Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E3EAE5]">
                        {staffPerformance.map((st) => (
                          <tr key={st.staffId || 'unassigned'} className="hover:bg-[#F3FAF5] transition">
                            <td className="py-3 pl-2 font-bold text-[#17231C]">
                              <div>{st.name}</div>
                              <span className="text-[11px] font-normal text-[#66736B]">
                                {st.title}
                              </span>
                            </td>
                            <td className="py-3 text-center font-mono font-bold text-[#17231C]">
                              {st.totalAppointments}
                            </td>
                            <td className="py-3 text-center font-mono font-bold text-[#16834A]">
                              {st.completed}
                            </td>
                            <td className="py-3 text-center font-mono font-bold text-rose-600">
                              {st.cancelled}
                            </td>
                            <td className="py-3 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[11px] bg-[#EAF6EE] text-[#11643A]">
                                {st.completionRate}%
                              </span>
                            </td>
                            <td className="py-3 pr-2 text-right font-mono font-extrabold text-[#11643A]">
                              ${st.revenue.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

