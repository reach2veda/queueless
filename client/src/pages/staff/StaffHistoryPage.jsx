import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  History,
  CheckCircle2,
  Clock,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Tag,
  Building2,
  AlertCircle,
  Timer,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import DashboardSidebar from '../../components/layout/DashboardSidebar';
import DashboardNavbar from '../../components/layout/DashboardNavbar';
import Button from '../../components/ui/Button';
import api from '../../services/api';

function formatDisplayDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    return dateStr;
  } catch (err) {
    return dateStr;
  }
}

function formatDisplayTime(isoOrTimeStr) {
  if (!isoOrTimeStr) return '—';
  try {
    if (isoOrTimeStr.includes('T')) {
      const d = new Date(isoOrTimeStr);
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
    return isoOrTimeStr;
  } catch (err) {
    return isoOrTimeStr;
  }
}

function formatMinutes(mins) {
  if (mins === null || mins === undefined || isNaN(mins)) return '—';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

export default function StaffHistoryPage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Data state
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState({
    totalCompleted: 0,
    todayCompleted: 0,
    avgDurationMinutes: null,
    totalDurationMinutes: 0,
    recordedDurationCount: 0,
  });
  const [dailySummary, setDailySummary] = useState([]);
  const [staffProfile, setStaffProfile] = useState(null);
  const [business, setBusiness] = useState(null);
  const [servicesList, setServicesList] = useState([]);

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    totalRecords: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [dailyExpanded, setDailyExpanded] = useState(true);

  // Filter state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('completed');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [datePreset, setDatePreset] = useState('all');

  // Handle Preset Changes
  const applyPreset = (preset) => {
    setDatePreset(preset);
    setPage(1);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === '7days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 6);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === '30days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 29);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setServiceFilter('all');
    setStatusFilter('completed');
    setStartDate('');
    setEndDate('');
    setDatePreset('all');
    setPage(1);
  };

  // Fetch History
  const fetchHistory = useCallback(
    async (isManual = false) => {
      if (isManual) setIsRefreshing(true);
      setError('');

      try {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', '15');
        if (search.trim()) params.append('search', search.trim());
        if (serviceFilter !== 'all') params.append('serviceId', serviceFilter);
        if (statusFilter !== 'all') params.append('status', statusFilter);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const res = await api.get(`/staff/history?${params.toString()}`);
        if (res.data?.success) {
          setHistory(res.data.history || []);
          if (res.data.summary) setSummary(res.data.summary);
          if (res.data.dailySummary) setDailySummary(res.data.dailySummary);
          if (res.data.pagination) setPagination(res.data.pagination);
          if (res.data.staff) {
            setStaffProfile(res.data.staff);
            if (Array.isArray(res.data.staff.services)) {
              setServicesList(res.data.staff.services);
            }
          }
          if (res.data.business) setBusiness(res.data.business);
        }
      } catch (err) {
        console.error('Failed to load staff service history:', err);
        const msg =
          err.response?.data?.error?.message ||
          err.message ||
          'Failed to load service history records from MongoDB';
        setError(msg);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, search, serviceFilter, statusFilter, startDate, endDate]
  );

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (serviceFilter !== 'all') count++;
    if (statusFilter !== 'completed') count++;
    if (startDate || endDate) count++;
    return count;
  }, [search, serviceFilter, statusFilter, startDate, endDate]);

  return (
    <div className="min-h-screen bg-[#F3FAF5] flex">
      <DashboardSidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardNavbar
          title="Staff Completed Service History"
          toggleSidebar={() => setSidebarOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Header Banner */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#16834A] bg-[#EAF6EE] px-2.5 py-1 rounded-full">
                  Counter Activity & Service Logs
                </span>
                <span className="text-xs font-medium text-[#66736B]">
                  • {business?.name || 'Practitioner Roster'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17231C]">
                Completed Service History
              </h1>
              <p className="text-xs sm:text-sm text-[#66736B]">
                Track completed visits, recorded consultation durations, counter check-in timestamps, and daily productivity for{' '}
                <span className="font-semibold text-[#17231C]">{staffProfile?.name || user?.name || 'Staff Member'}</span>.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchHistory(true)}
                leftIcon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#16834A]' : ''}`} />}
              >
                Refresh Logs
              </Button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 flex items-center justify-between shadow-soft-sm">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                <p className="text-xs sm:text-sm font-semibold">{error}</p>
              </div>
              <button
                onClick={() => fetchHistory(true)}
                className="text-xs underline font-bold hover:text-rose-900"
              >
                Retry
              </button>
            </div>
          )}

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Total Completed */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E3EAE5] shadow-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#66736B]">
                  Total Completed Visits
                </span>
                <div className="w-9 h-9 rounded-xl bg-[#EAF6EE] text-[#16834A] flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#17231C]">
                {loading ? '—' : summary.totalCompleted}
              </h3>
              <p className="text-xs text-[#66736B]">All-time verified visits handled</p>
            </div>

            {/* Today Completed */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E3EAE5] shadow-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#66736B]">
                  Completed Today
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#17231C]">
                {loading ? '—' : summary.todayCompleted}
              </h3>
              <p className="text-xs text-[#66736B]">Customers served today</p>
            </div>

            {/* Average Service Duration */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E3EAE5] shadow-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#66736B]">
                  Avg Service Duration
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#17231C]">
                {loading
                  ? '—'
                  : summary.avgDurationMinutes !== null
                  ? `${summary.avgDurationMinutes} min`
                  : 'N/A'}
              </h3>
              <p className="text-xs text-[#66736B]">
                {summary.recordedDurationCount > 0
                  ? `Based on ${summary.recordedDurationCount} timed visits`
                  : 'No duration records yet'}
              </p>
            </div>

            {/* Total Service Time */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E3EAE5] shadow-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#66736B]">
                  Total Service Time
                </span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Timer className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#17231C]">
                {loading ? '—' : formatMinutes(summary.totalDurationMinutes)}
              </h3>
              <p className="text-xs text-[#66736B]">Total cumulative counter time</p>
            </div>
          </div>

          {/* Daily Productivity Summary (Collapsible) */}
          {dailySummary.length > 0 && (
            <div className="bg-white rounded-3xl border border-[#E3EAE5] shadow-card overflow-hidden">
              <button
                type="button"
                onClick={() => setDailyExpanded(!dailyExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-[#F3FAF5] transition-colors border-b border-[#E3EAE5]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#EAF6EE] text-[#16834A] flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-[#17231C]">
                    Daily Summary Breakdown ({dailySummary.length} Active Days)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#66736B]">
                  <span>{dailyExpanded ? 'Collapse' : 'Expand'}</span>
                  {dailyExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {dailyExpanded && (
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 bg-[#F8FAF9]">
                  {dailySummary.slice(0, 8).map((day) => (
                    <div
                      key={day.date}
                      className="bg-white p-4 rounded-2xl border border-[#E3EAE5] shadow-soft-sm space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#17231C]">
                          {formatDisplayDate(day.date)}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EAF6EE] text-[#11643A]">
                          {day.visitCount} visits
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#66736B] pt-1 border-t border-[#F3FAF5]">
                        <span>Avg Duration:</span>
                        <span className="font-semibold text-[#17231C]">
                          {day.avgDurationMinutes !== null ? `${day.avgDurationMinutes}m` : '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#66736B]">
                        <span>Total Duration:</span>
                        <span className="font-semibold text-[#17231C]">
                          {day.totalDurationMinutes > 0 ? formatMinutes(day.totalDurationMinutes) : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Filter & Search Toolbar */}
          <div className="bg-white rounded-3xl p-6 border border-[#E3EAE5] shadow-card space-y-4">
            {/* Top row: Search and Preset Buttons */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-lg">
                <Search className="w-4 h-4 text-[#66736B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by customer name, booking reference (BK-...), token..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E3EAE5] bg-[#F8FAF9] text-xs sm:text-sm text-[#17231C] placeholder-[#66736B] focus:outline-none focus:border-[#16834A] focus:bg-white transition-all"
                />
                {search && (
                  <button
                    onClick={() => {
                      setSearch('');
                      setPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#66736B] hover:text-[#17231C]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Date Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'all', label: 'All Time' },
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: '7days', label: 'Past 7 Days' },
                  { id: '30days', label: 'Past 30 Days' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      datePreset === preset.id
                        ? 'bg-[#16834A] text-white shadow-soft-sm'
                        : 'bg-[#F3FAF5] text-[#66736B] hover:text-[#17231C] hover:bg-[#EAF6EE]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom row: Dropdowns, Custom Dates, and Reset */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-[#E3EAE5]">
              {/* Service Filter */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#66736B] mb-1">
                  Service
                </label>
                <select
                  value={serviceFilter}
                  onChange={(e) => {
                    setServiceFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-[#E3EAE5] bg-white text-xs font-medium text-[#17231C] focus:outline-none focus:border-[#16834A]"
                >
                  <option value="all">All Services</option>
                  {servicesList.map((srv) => (
                    <option key={srv._id} value={srv._id}>
                      {srv.name} ({srv.durationMinutes}m)
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#66736B] mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-[#E3EAE5] bg-white text-xs font-medium text-[#17231C] focus:outline-none focus:border-[#16834A]"
                >
                  <option value="completed">Completed Only</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no_show">No-Show</option>
                  <option value="all">All Statuses</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#66736B] mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset('custom');
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-[#E3EAE5] bg-white text-xs font-medium text-[#17231C] focus:outline-none focus:border-[#16834A]"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#66736B] mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset('custom');
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-[#E3EAE5] bg-white text-xs font-medium text-[#17231C] focus:outline-none focus:border-[#16834A]"
                />
              </div>
            </div>

            {/* Active Filter Pill & Reset */}
            {activeFilterCount > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-[#F3FAF5]">
                <span className="text-xs font-semibold text-[#16834A]">
                  Active filters: {activeFilterCount}
                </span>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  Reset all filters
                </button>
              </div>
            )}
          </div>

          {/* Service History Table */}
          <div className="bg-white rounded-3xl border border-[#E3EAE5] shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E3EAE5] flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-[#17231C]">
                  Completed Counter Audit Logs
                </h3>
                <p className="text-xs text-[#66736B]">
                  Showing {history.length} of {pagination.totalRecords} matching records
                </p>
              </div>

              {pagination.totalPages > 1 && (
                <div className="text-xs font-bold text-[#66736B]">
                  Page {pagination.page} of {pagination.totalPages}
                </div>
              )}
            </div>

            {loading ? (
              <div className="p-16 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-8 h-8 text-[#16834A] animate-spin" />
                <p className="text-xs sm:text-sm font-semibold text-[#17231C]">
                  Loading service history from MongoDB...
                </p>
              </div>
            ) : history.length === 0 ? (
              <div className="p-16 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#EAF6EE] text-[#16834A] flex items-center justify-center mb-1">
                  <History className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-[#17231C]">No Service Records Found</h4>
                <p className="text-xs text-[#66736B] max-w-sm">
                  {activeFilterCount > 0
                    ? 'No completed appointments match your current search and filter criteria. Try resetting your filters.'
                    : 'No completed appointments have been handled by this staff account yet.'}
                </p>
                {activeFilterCount > 0 && (
                  <Button variant="outline" size="sm" onClick={handleResetFilters}>
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[#F8FAF9] text-[#66736B] uppercase font-bold text-[11px] tracking-wider border-b border-[#E3EAE5]">
                    <tr>
                      <th className="py-3.5 px-6">Customer & Token</th>
                      <th className="py-3.5 px-6">Service</th>
                      <th className="py-3.5 px-6">Date & Slot</th>
                      <th className="py-3.5 px-6">Check-In / Called</th>
                      <th className="py-3.5 px-6">Completed Time</th>
                      <th className="py-3.5 px-6">Actual Duration</th>
                      <th className="py-3.5 px-6">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3EAE5]">
                    {history.map((record) => (
                      <tr key={record._id} className="hover:bg-[#F3FAF5]/60 transition-colors">
                        {/* Customer & Token */}
                        <td className="py-4 px-6">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#17231C]">{record.customerName}</span>
                              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-[#EAF6EE] text-[#11643A] border border-[#C7E8D3]">
                                {record.tokenNumber}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-[#66736B]">
                              <span className="font-mono text-[11px] text-[#16834A]">{record.bookingReference}</span>
                              {record.customerPhone && (
                                <>
                                  <span>•</span>
                                  <span>{record.customerPhone}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Service */}
                        <td className="py-4 px-6">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-[#17231C]">{record.serviceName}</span>
                            <div className="text-xs text-[#66736B]">
                              Sched: {record.serviceDurationMinutes}m • ${record.servicePrice}
                            </div>
                          </div>
                        </td>

                        {/* Date & Slot */}
                        <td className="py-4 px-6">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-[#17231C]">
                              {formatDisplayDate(record.appointmentDate)}
                            </span>
                            <div className="text-xs text-[#66736B]">
                              {record.startTime} – {record.endTime}
                            </div>
                          </div>
                        </td>

                        {/* Check-In Time */}
                        <td className="py-4 px-6">
                          <div className="space-y-0.5">
                            <span className="font-medium text-[#17231C]">
                              {formatDisplayTime(record.checkInTime)}
                            </span>
                            <div className="text-[11px] text-[#66736B]">{record.counterName || 'Counter 1'}</div>
                          </div>
                        </td>

                        {/* Completed Time */}
                        <td className="py-4 px-6">
                          <span className="font-medium text-[#17231C]">
                            {formatDisplayTime(record.completionTime)}
                          </span>
                        </td>

                        {/* Actual Duration */}
                        <td className="py-4 px-6">
                          {record.actualDurationMinutes !== null ? (
                            <span className="inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs">
                              <Timer className="w-3.5 h-3.5 text-blue-600" />
                              {record.actualDurationMinutes} min
                            </span>
                          ) : (
                            <span className="text-xs text-[#66736B]">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-6">
                          {record.status === 'completed' ? (
                            <span className="inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Completed
                            </span>
                          ) : record.status === 'cancelled' ? (
                            <span className="inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs">
                              Cancelled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs capitalize">
                              {record.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 bg-[#F8FAF9] border-t border-[#E3EAE5] flex items-center justify-between">
                <div className="text-xs text-[#66736B]">
                  Showing {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.totalRecords)} of{' '}
                  {pagination.totalRecords} visits
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasPrevPage}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                  >
                    Previous
                  </Button>
                  <span className="text-xs font-bold text-[#17231C] px-2">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasNextPage}
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

