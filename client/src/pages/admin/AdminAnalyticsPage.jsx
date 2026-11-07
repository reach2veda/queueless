import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
  ArrowDownRight,
  AlertCircle,
  ChevronDown,
  Layers,
  PieChart as PieChartIcon,
  Activity,
  ShieldCheck,
  Award,
  ExternalLink,
  Loader2
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

const CATEGORY_MAP = {
  clinic: { label: 'Clinic', bg: 'bg-emerald-50', text: 'text-emerald-800' },
  salon: { label: 'Salon & Spa', bg: 'bg-pink-50', text: 'text-pink-800' },
  bank: { label: 'Bank / Finance', bg: 'bg-blue-50', text: 'text-blue-800' },
  service_center: { label: 'Service Center', bg: 'bg-amber-50', text: 'text-amber-800' },
  administrative: { label: 'Administrative', bg: 'bg-purple-50', text: 'text-purple-800' },
  other: { label: 'Other', bg: 'bg-slate-50', text: 'text-slate-800' },
};

export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Filter States
  const [timeframe, setTimeframe] = useState('all'); // 'all' | '7days' | '30days' | '90days' | '12months' | 'custom'
  const [granularity, setGranularity] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [appliedCustomDates, setAppliedCustomDates] = useState({ start: '', end: '' });
  const [leaderboardSort, setLeaderboardSort] = useState('revenue'); // 'revenue' | 'appointments'
  const [growthTab, setGrowthTab] = useState('revenue'); // 'revenue' | 'appointments' | 'users' | 'businesses'

  // UI States
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Data States
  const [data, setData] = useState({
    kpis: {
      totalUsers: 0,
      totalBusinesses: 0,
      totalAppointments: 0,
      totalCompleted: 0,
      totalCancelled: 0,
      totalRevenue: 0,
      activeBusinesses: 0,
      pendingVerification: 0,
      completionRate: 0,
      cancellationRate: 0,
      previousRevenue: 0,
      revenueGrowthRate: 0,
      lifetimeUsers: 0,
      lifetimeBusinesses: 0,
    },
    userGrowth: [],
    businessGrowth: [],
    appointmentTrends: [],
    revenueTrends: [],
    leaderboard: [],
    popularServices: [],
    statusDistribution: [],
    roleDistribution: [],
    verificationDistribution: [],
    monthlyRevenue: [],
  });

  // Fetch Admin Analytics
  const fetchAnalytics = useCallback(
    async (isManual = false) => {
      if (isManual) setIsRefreshing(true);
      setError('');

      try {
        const params = new URLSearchParams();
        params.append('timeframe', timeframe);
        params.append('granularity', granularity);
        params.append('sortBy', leaderboardSort);

        if (timeframe === 'custom' && appliedCustomDates.start && appliedCustomDates.end) {
          params.append('startDate', appliedCustomDates.start);
          params.append('endDate', appliedCustomDates.end);
        }

        const res = await api.get(`/analytics/admin/overview?${params.toString()}`);
        if (res.data?.success) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Failed to load admin analytics:', err);
        const msg =
          err.response?.data?.error?.message ||
          err.message ||
          'Failed to load platform analytics from MongoDB';
        setError(msg);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [timeframe, granularity, appliedCustomDates, leaderboardSort]
  );

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Handle custom date apply
  const handleApplyCustomDates = (e) => {
    e.preventDefault();
    if (!customStart || !customEnd) return;
    setAppliedCustomDates({ start: customStart, end: customEnd });
  };

  const { kpis } = data;

  return (
    <div className="min-h-screen bg-[#F3FAF5] flex">
      <DashboardSidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardNavbar
          title="Platform Intelligence & Analytics"
          toggleSidebar={() => setSidebarOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Header Banner */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#16834A] bg-[#EAF6EE] px-2.5 py-1 rounded-full">
                  Executive Intelligence
                </span>
                <span className="text-xs font-medium text-[#66736B]">
                  • Cross-Business MongoDB Atlas Telemetry
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17231C]">
                QueueLess Platform Analytics
              </h1>
              <p className="text-xs sm:text-sm text-[#66736B]">
                Real-time appointment volume, revenue generation, user registration trends, and healthcare provider throughput.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchAnalytics(true)}
                disabled={isRefreshing}
                className="gap-2 shrink-0"
              >
                <RefreshCw
                  className={`w-4 h-4 text-[#16834A] ${isRefreshing ? 'animate-spin' : ''}`}
                />
                <span>{isRefreshing ? 'Refreshing...' : 'Refresh Telemetry'}</span>
              </Button>
            </div>
          </div>

          {/* Timeframe & Granularity Filters Bar */}
          <div className="bg-white rounded-3xl p-6 border border-[#E3EAE5] shadow-card space-y-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              {/* Preset Timeframe Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[#66736B] uppercase tracking-wider mr-1">
                  Timeframe:
                </span>
                {[
                  { id: 'all', label: 'All Time' },
                  { id: '7days', label: 'Last 7 Days' },
                  { id: '30days', label: 'Last 30 Days' },
                  { id: '90days', label: 'Last 90 Days' },
                  { id: '12months', label: 'Past 12 Months' },
                  { id: 'custom', label: 'Custom Range' },
                ].map((tf) => (
                  <button
                    key={tf.id}
                    onClick={() => {
                      setTimeframe(tf.id);
                      if (tf.id !== 'custom') {
                        setAppliedCustomDates({ start: '', end: '' });
                      }
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                      timeframe === tf.id
                        ? 'bg-[#16834A] text-white shadow-sm'
                        : 'bg-[#F3FAF5] text-[#66736B] hover:bg-[#EAF6EE] hover:text-[#16834A]'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>

              {/* Granularity Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#66736B] uppercase tracking-wider">
                  Interval:
                </span>
                <div className="flex rounded-xl bg-[#F3FAF5] p-1 border border-[#E3EAE5] text-xs">
                  {['daily', 'weekly', 'monthly'].map((gran) => (
                    <button
                      key={gran}
                      onClick={() => setGranularity(gran)}
                      className={`px-3 py-1 rounded-lg capitalize font-semibold transition ${
                        granularity === gran
                          ? 'bg-white text-[#16834A] shadow-sm'
                          : 'text-[#66736B] hover:text-[#17231C]'
                      }`}
                    >
                      {gran}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom Date Range Picker */}
            {timeframe === 'custom' && (
              <form
                onSubmit={handleApplyCustomDates}
                className="pt-4 border-t border-[#E3EAE5] flex flex-wrap items-center gap-3 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#66736B]">From:</span>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="px-3 py-1.5 bg-[#F3FAF5] border border-[#E3EAE5] rounded-xl text-xs text-[#17231C] focus:outline-none focus:ring-2 focus:ring-[#16834A]/20"
                    required
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#66736B]">To:</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="px-3 py-1.5 bg-[#F3FAF5] border border-[#E3EAE5] rounded-xl text-xs text-[#17231C] focus:outline-none focus:ring-2 focus:ring-[#16834A]/20"
                    required
                  />
                </div>
                <Button type="submit" size="sm" className="bg-[#16834A] hover:bg-[#11643A] text-white">
                  Apply Date Filter
                </Button>
              </form>
            )}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => fetchAnalytics(true)}>
                Retry
              </Button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 1. EXECUTIVE PLATFORM KPI CARDS (8 LIVE METRICS)                         */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Registered Users */}
            <div className="bg-white rounded-3xl p-5 border border-[#E3EAE5] shadow-card hover:border-[#16834A]/40 transition-colors flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#66736B]">Registered Users</span>
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-[#17231C]">
                  {loading ? '—' : kpis.totalUsers}
                </span>
                <p className="text-[11px] text-[#66736B] mt-0.5">
                  Platform users ({kpis.lifetimeUsers} all-time)
                </p>
              </div>
            </div>

            {/* Card 2: Total Registered Businesses */}
            <div className="bg-white rounded-3xl p-5 border border-[#E3EAE5] shadow-card hover:border-[#16834A]/40 transition-colors flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#66736B]">Businesses</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-[#17231C]">
                  {loading ? '—' : kpis.totalBusinesses}
                </span>
                <p className="text-[11px] text-[#66736B] mt-0.5">
                  Registered clinics & hubs ({kpis.activeBusinesses} active)
                </p>
              </div>
            </div>

            {/* Card 3: Total Appointments */}
            <div className="bg-white rounded-3xl p-5 border border-[#E3EAE5] shadow-card hover:border-[#16834A]/40 transition-colors flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#66736B]">Total Bookings</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-[#17231C]">
                  {loading ? '—' : kpis.totalAppointments}
                </span>
                <p className="text-[11px] text-[#66736B] mt-0.5">Across all facilities</p>
              </div>
            </div>

            {/* Card 4: Total Completed Appointments */}
            <div className="bg-white rounded-3xl p-5 border border-[#E3EAE5] shadow-card hover:border-[#16834A]/40 transition-colors flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#16834A]">Completed Visits</span>
                <div className="w-8 h-8 rounded-xl bg-[#EAF6EE] text-[#16834A] flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#16834A]">
                    {loading ? '—' : kpis.totalCompleted}
                  </span>
                  <span className="text-xs font-bold text-[#16834A] bg-[#EAF6EE] px-2 py-0.5 rounded-full">
                    {kpis.completionRate}%
                  </span>
                </div>
                <p className="text-[11px] text-[#66736B] mt-0.5">Successful consultations</p>
              </div>
            </div>

            {/* Card 5: Total Cancelled Appointments */}
            <div className="bg-white rounded-3xl p-5 border border-[#E3EAE5] shadow-card hover:border-rose-400 transition-colors flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-rose-700">Cancelled Bookings</span>
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <XCircle className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-rose-600">
                    {loading ? '—' : kpis.totalCancelled}
                  </span>
                  <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                    {kpis.cancellationRate}%
                  </span>
                </div>
                <p className="text-[11px] text-[#66736B] mt-0.5">Revoked appointments</p>
              </div>
            </div>

            {/* Card 6: Total Platform Revenue */}
            <div className="bg-white rounded-3xl p-5 border border-[#E3EAE5] shadow-card hover:border-[#16834A]/40 transition-colors flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#16834A]">Platform Revenue</span>
                <div className="w-8 h-8 rounded-xl bg-[#EAF6EE] text-[#16834A] flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#11643A]">
                    ${loading ? '—' : (kpis.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  {kpis.revenueGrowthRate !== 0 && (
                    <span
                      className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md flex items-center ${
                        kpis.revenueGrowthRate > 0
                          ? 'bg-[#EAF6EE] text-[#16834A]'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {kpis.revenueGrowthRate > 0 ? (
                        <ArrowUpRight className="w-3 h-3 mr-0.5" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3 mr-0.5" />
                      )}
                      {kpis.revenueGrowthRate}%
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#66736B] mt-0.5">Completed visits only</p>
              </div>
            </div>

            {/* Card 7: Active Businesses */}
            <div className="bg-white rounded-3xl p-5 border border-[#E3EAE5] shadow-card hover:border-emerald-400 transition-colors flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-emerald-700">Active Facilities</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-[#17231C]">
                  {loading ? '—' : kpis.activeBusinesses}
                </span>
                <p className="text-[11px] text-[#66736B] mt-0.5">Operational businesses</p>
              </div>
            </div>

            {/* Card 8: Pending Business Verifications */}
            <div className="bg-white rounded-3xl p-5 border border-[#E3EAE5] shadow-card hover:border-amber-400 transition-colors flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-amber-700">Pending Review</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-amber-600">
                  {loading ? '—' : kpis.pendingVerification}
                </span>
                <p className="text-[11px] text-[#66736B] mt-0.5">Awaiting verification</p>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. PLATFORM GROWTH ANALYTICS (INTERACTIVE RECHARTS)                      */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E3EAE5] pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#17231C]">
                  Platform Growth & Telemetry Trends
                </h3>
                <p className="text-xs text-[#66736B]">
                  Interactive time-series visualizations across revenue, appointments, users, and businesses.
                </p>
              </div>

              {/* Chart View Switcher */}
              <div className="flex rounded-2xl bg-[#F3FAF5] p-1 border border-[#E3EAE5] text-xs font-semibold">
                {[
                  { id: 'revenue', label: 'Revenue Trends', icon: DollarSign },
                  { id: 'appointments', label: 'Appointment Volume', icon: Calendar },
                  { id: 'users', label: 'User Growth', icon: Users },
                  { id: 'businesses', label: 'Business Growth', icon: Building2 },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setGrowthTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                        growthTab === tab.id
                          ? 'bg-[#16834A] text-white shadow-sm'
                          : 'text-[#66736B] hover:text-[#17231C]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CHART 1: REVENUE TRENDS */}
            {growthTab === 'revenue' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-[#66736B]">
                  <span>Total Earned Revenue from Completed Consultations ($)</span>
                  <span className="font-semibold text-[#16834A]">
                    Period Total: ${(kpis.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="h-72 w-full">
                  {data.revenueTrends.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-[#66736B]">
                      No revenue recorded for the selected timeframe.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={data.revenueTrends}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#16834A" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#16834A" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E3EAE5" />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: '#66736B', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: '#66736B', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => `$${v}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            borderRadius: '16px',
                            border: '1px solid #E3EAE5',
                            fontSize: '12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                          }}
                          formatter={(value) => [`$${value.toFixed(2)}`, 'Earned Revenue']}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#16834A"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorRev)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}

            {/* CHART 2: APPOINTMENT VOLUME */}
            {growthTab === 'appointments' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-[#66736B]">
                  <span>Platform Appointment Throughput</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[#16834A]">
                      <span className="w-2 h-2 rounded-full bg-[#16834A]" /> Completed
                    </span>
                    <span className="flex items-center gap-1 text-[#0284C7]">
                      <span className="w-2 h-2 rounded-full bg-[#0284C7]" /> Confirmed/In Queue
                    </span>
                    <span className="flex items-center gap-1 text-rose-600">
                      <span className="w-2 h-2 rounded-full bg-rose-600" /> Cancelled
                    </span>
                  </div>
                </div>
                <div className="h-72 w-full">
                  {data.appointmentTrends.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-[#66736B]">
                      No appointments recorded for the selected timeframe.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.appointmentTrends}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E3EAE5" />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: '#66736B', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: '#66736B', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            borderRadius: '16px',
                            border: '1px solid #E3EAE5',
                            fontSize: '12px',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Bar dataKey="completed" name="Completed" fill="#16834A" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="confirmed" name="Confirmed" fill="#0284C7" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="cancelled" name="Cancelled" fill="#E11D48" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}

            {/* CHART 3: USER GROWTH */}
            {growthTab === 'users' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-[#66736B]">
                  <span>New User Registrations Over Time</span>
                  <span className="font-semibold text-[#17231C]">
                    Total New Users: {kpis.totalUsers}
                  </span>
                </div>
                <div className="h-72 w-full">
                  {data.userGrowth.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-[#66736B]">
                      No users registered in this timeframe.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.userGrowth}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E3EAE5" />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: '#66736B', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: '#66736B', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            borderRadius: '16px',
                            border: '1px solid #E3EAE5',
                            fontSize: '12px',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Bar dataKey="customer" name="Customers" fill="#0284C7" stackId="a" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="provider" name="Providers" fill="#7C3AED" stackId="a" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="staff" name="Staff" fill="#16834A" stackId="a" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}

            {/* CHART 4: BUSINESS GROWTH */}
            {growthTab === 'businesses' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-[#66736B]">
                  <span>New Business Registrations by Verification Status</span>
                  <span className="font-semibold text-[#17231C]">
                    Total Registered: {kpis.totalBusinesses}
                  </span>
                </div>
                <div className="h-72 w-full">
                  {data.businessGrowth.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-[#66736B]">
                      No businesses registered in this timeframe.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.businessGrowth}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E3EAE5" />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: '#66736B', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: '#66736B', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            borderRadius: '16px',
                            border: '1px solid #E3EAE5',
                            fontSize: '12px',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Bar dataKey="verified" name="Verified" fill="#16834A" stackId="b" />
                        <Bar dataKey="pending" name="Pending" fill="#D97706" stackId="b" />
                        <Bar dataKey="rejected" name="Rejected" fill="#DC2626" stackId="b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 3. BUSINESS PERFORMANCE LEADERBOARD                                      */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E3EAE5]">
              <div>
                <h3 className="text-lg font-bold text-[#17231C]">
                  Healthcare Facility Performance Leaderboard
                </h3>
                <p className="text-xs text-[#66736B]">
                  Top performing clinics, salons, and offices ranked by revenue and booking volume.
                </p>
              </div>

              {/* Sort Controls */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#66736B] uppercase tracking-wider">
                  Rank By:
                </span>
                <select
                  value={leaderboardSort}
                  onChange={(e) => setLeaderboardSort(e.target.value)}
                  className="px-3 py-1.5 bg-[#F3FAF5] border border-[#E3EAE5] rounded-xl text-xs font-semibold text-[#17231C] focus:outline-none"
                >
                  <option value="revenue">Highest Earned Revenue ($)</option>
                  <option value="appointments">Appointment Volume</option>
                </select>
              </div>
            </div>

            {data.leaderboard.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#66736B]">
                No business appointment activity found for this period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F3FAF5] border-b border-[#E3EAE5] text-[11px] font-bold uppercase tracking-wider text-[#66736B]">
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Business Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-center">Total Bookings</th>
                      <th className="py-3 px-4 text-center">Completed</th>
                      <th className="py-3 px-4 text-center">Completion Rate</th>
                      <th className="py-3 px-4 text-right">Earned Revenue</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3EAE5] text-xs">
                    {data.leaderboard.map((biz, idx) => {
                      const catStyle = CATEGORY_MAP[biz.category] || CATEGORY_MAP.other;
                      return (
                        <tr key={biz.businessId} className="hover:bg-[#F3FAF5]/60 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-[#17231C]">
                            <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold">
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-[#17231C] block">{biz.name}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${catStyle.bg} ${catStyle.text}`}
                            >
                              {catStyle.label}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-semibold text-[#17231C]">
                            {biz.totalAppointments}
                          </td>
                          <td className="py-3.5 px-4 text-center font-semibold text-[#16834A]">
                            {biz.completedAppointments}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="font-bold text-[#16834A]">{biz.completionRate}%</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-[#11643A]">
                            ${biz.revenue.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Link to="/admin/businesses">
                              <button
                                title="View in Business Management"
                                className="p-1 rounded-lg text-[#66736B] hover:text-[#16834A] hover:bg-[#EAF6EE] transition"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 4. PLATFORM INSIGHTS (DISTRIBUTION DONUTS & POPULAR SERVICES)            */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Popular Services Across Platform */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E3EAE5]">
                <h3 className="text-base font-bold text-[#17231C]">
                  Most Popular Services Platform-Wide
                </h3>
                <span className="text-xs text-[#66736B]">Ranked by bookings</span>
              </div>

              {data.popularServices.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#66736B]">
                  No services booked in this timeframe.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.popularServices.map((srv, idx) => (
                    <div
                      key={srv.serviceId}
                      className="p-3.5 bg-[#F3FAF5] rounded-2xl border border-[#E3EAE5] flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#17231C] truncate">{srv.name}</span>
                          <span className="bg-white text-[#66736B] px-2 py-0.5 rounded text-[10px] font-semibold border border-[#E3EAE5]">
                            {srv.businessName}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#66736B]">
                          {srv.totalBookings} bookings ({srv.completedBookings} completed) •{' '}
                          {srv.sharePercentage}% share
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-[#11643A] block">
                          ${srv.revenue.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-[#66736B]">${srv.price.toFixed(2)}/visit</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Appointment Status & Role Distributions */}
            <div className="space-y-6">
              {/* Status Distribution Donut */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E3EAE5]">
                  <h3 className="text-base font-bold text-[#17231C]">
                    Appointment Status Distribution
                  </h3>
                  <span className="text-xs text-[#66736B]">
                    {kpis.totalAppointments} total
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="h-48 w-48 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.statusDistribution.filter((d) => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {data.statusDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2 flex-1 text-xs">
                    {data.statusDistribution.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-medium text-[#17231C]">{item.name}</span>
                        </div>
                        <span className="font-bold text-[#66736B]">
                          {item.value} (
                          {kpis.totalAppointments > 0
                            ? Math.round((item.value / kpis.totalAppointments) * 100)
                            : 0}
                          %)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* User Roles & Business Verifications Combined */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* User Roles */}
                <div className="bg-white rounded-3xl p-5 border border-[#E3EAE5] shadow-card space-y-3">
                  <h4 className="text-xs font-bold text-[#66736B] uppercase tracking-wider">
                    User Roles Breakdown
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    {data.roleDistribution.map((r) => (
                      <div key={r.name} className="flex items-center justify-between">
                        <span className="font-medium text-[#17231C]">{r.name}</span>
                        <span className="font-bold text-[#66736B]">{r.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Verification Status */}
                <div className="bg-white rounded-3xl p-5 border border-[#E3EAE5] shadow-card space-y-3">
                  <h4 className="text-xs font-bold text-[#66736B] uppercase tracking-wider">
                    Business Verifications
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    {data.verificationDistribution.map((v) => (
                      <div key={v.name} className="flex items-center justify-between">
                        <span className="font-medium text-[#17231C]">{v.name}</span>
                        <span className="font-bold text-[#66736B]">{v.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

