import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Building2,
  Lock,
  Layers,
  ArrowRight,
  Copy,
  Check,
  AlertCircle,
  FileText,
  Activity,
  Server,
  Terminal,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import DashboardSidebar from '../../components/layout/DashboardSidebar';
import DashboardNavbar from '../../components/layout/DashboardNavbar';
import Button from '../../components/ui/Button';
import api from '../../services/api';

const CATEGORY_STYLES = {
  AUTH: { label: 'Auth & Login', bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200' },
  USER_MGMT: { label: 'User Mgmt', bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
  BUSINESS_MGMT: { label: 'Business Mgmt', bg: 'bg-[#EAF6EE]', text: 'text-[#16834A]', border: 'border-[#16834A]/25' },
  APPOINTMENT: { label: 'Appointment', bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200' },
  SERVICE: { label: 'Service', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  SECURITY: { label: 'Security Alert', bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' },
  SYSTEM: { label: 'System Kernel', bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200' },
};

const SEVERITY_STYLES = {
  info: { label: 'Info', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-500' },
  warning: { label: 'Warning', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500' },
  critical: { label: 'Critical', bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', dot: 'bg-rose-600' },
};

const STATUS_STYLES = {
  success: { label: 'Success', bg: 'bg-[#EAF6EE]', text: 'text-[#16834A]', border: 'border-[#16834A]/25' },
  failure: { label: 'Failed', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  blocked: { label: 'Blocked', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
};

function formatTimestamp(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  const dateFormatted = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeFormatted = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  return `${dateFormatted} at ${timeFormatted}`;
}

function timeAgo(isoStr) {
  if (!isoStr) return '';
  const seconds = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (seconds < 60) return `${Math.max(1, seconds)}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AdminLogsPage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Data States
  const [logs, setLogs] = useState([]);
  const [kpis, setKpis] = useState({
    totalLogs: 0,
    todayEvents: 0,
    adminActions: 0,
    securityEvents: 0,
    failedActions: 0,
    uniqueAdmins: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    totalLogs: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Filter & Search States
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);

  // UI States
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Selected Log Modal State
  const [selectedLog, setSelectedLog] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch Logs
  const fetchLogs = useCallback(
    async (isManual = false) => {
      if (isManual) setIsRefreshing(true);
      setError('');

      try {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', '15');
        if (search.trim()) params.append('search', search.trim());
        if (categoryFilter !== 'all') params.append('category', categoryFilter);
        if (severityFilter !== 'all') params.append('severity', severityFilter);
        if (statusFilter !== 'all') params.append('status', statusFilter);
        if (roleFilter !== 'all') params.append('role', roleFilter);
        if (resourceFilter !== 'all') params.append('resourceType', resourceFilter);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        params.append('sortBy', 'createdAt');
        params.append('sortOrder', sortOrder);

        const res = await api.get(`/admin/logs?${params.toString()}`);
        if (res.data?.success) {
          setLogs(res.data.logs || []);
          if (res.data.kpis) setKpis(res.data.kpis);
          if (res.data.pagination) setPagination(res.data.pagination);
        }
      } catch (err) {
        console.error('Failed to load audit logs:', err);
        const msg =
          err.response?.data?.error?.message ||
          err.message ||
          'Failed to load security audit logs from MongoDB';
        setError(msg);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, search, categoryFilter, severityFilter, statusFilter, roleFilter, resourceFilter, startDate, endDate, sortOrder]
  );

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Open Details Modal
  const handleOpenDetails = (log) => {
    setSelectedLog(log);
    setCopied(false);
    setModalOpen(true);
  };

  const handleCopyJson = () => {
    if (!selectedLog) return;
    navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F3FAF5] flex">
      <DashboardSidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardNavbar
          title="Security & Activity Audit Logs"
          toggleSidebar={() => setSidebarOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Header Banner */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#16834A] bg-[#EAF6EE] px-2.5 py-1 rounded-full">
                  Platform Compliance & Audit
                </span>
                <span className="text-xs font-medium text-[#66736B]">
                  • Immutable Event Log
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17231C]">
                Security & Activity Audit Trail
              </h1>
              <p className="text-xs sm:text-sm text-[#66736B]">
                Tamper-resistant audit record of administrative actions, user permission changes, business verifications, and authentication events.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLogs(true)}
                disabled={isRefreshing}
                className="gap-2 shrink-0"
              >
                <RefreshCw
                  className={`w-4 h-4 text-[#16834A] ${isRefreshing ? 'animate-spin' : ''}`}
                />
                <span>{isRefreshing ? 'Refreshing...' : 'Refresh Logs'}</span>
              </Button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* 1. Total Audit Events */}
            <div className="bg-white rounded-2xl p-5 border border-[#E3EAE5] shadow-card hover:border-[#16834A]/40 transition-colors flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#66736B]">Total Events</span>
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-[#17231C]">
                  {loading ? '—' : kpis.totalLogs}
                </span>
                <p className="text-[11px] text-[#66736B] mt-0.5">Immutable records</p>
              </div>
            </div>

            {/* 2. Today's Events */}
            <div className="bg-white rounded-2xl p-5 border border-[#E3EAE5] shadow-card hover:border-[#16834A]/40 transition-colors flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#16834A]">Today's Events</span>
                <div className="w-8 h-8 rounded-xl bg-[#EAF6EE] text-[#16834A] flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-[#16834A]">
                  {loading ? '—' : kpis.todayEvents}
                </span>
                <p className="text-[11px] text-[#66736B] mt-0.5">Recorded today</p>
              </div>
            </div>

            {/* 3. Administrative Actions */}
            <div className="bg-white rounded-2xl p-5 border border-[#E3EAE5] shadow-card hover:border-purple-400 transition-colors flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-purple-700">Admin Actions</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-purple-800">
                  {loading ? '—' : kpis.adminActions}
                </span>
                <p className="text-[11px] text-[#66736B] mt-0.5">Admin operations</p>
              </div>
            </div>

            {/* 4. Security Events */}
            <div className="bg-white rounded-2xl p-5 border border-[#E3EAE5] shadow-card hover:border-amber-400 transition-colors flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-amber-700">Security & Auth</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-amber-600">
                  {loading ? '—' : kpis.securityEvents}
                </span>
                <p className="text-[11px] text-[#66736B] mt-0.5">Logins & warnings</p>
              </div>
            </div>

            {/* 5. Failed / Blocked Actions */}
            <div className="bg-white rounded-2xl p-5 border border-[#E3EAE5] shadow-card hover:border-rose-400 transition-colors flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-rose-700">Failed / Blocked</span>
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-rose-600">
                  {loading ? '—' : kpis.failedActions}
                </span>
                <p className="text-[11px] text-[#66736B] mt-0.5">Rejections & safeguards</p>
              </div>
            </div>

            {/* 6. Active Administrators */}
            <div className="bg-white rounded-2xl p-5 border border-[#E3EAE5] shadow-card hover:border-sky-400 transition-colors flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-sky-700">Active Admins</span>
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-[#17231C]">
                  {loading ? '—' : kpis.uniqueAdmins}
                </span>
                <p className="text-[11px] text-[#66736B] mt-0.5">Distinct actors</p>
              </div>
            </div>
          </div>

          {/* Search, Filter Bar, and Date Ranges */}
          <div className="bg-white rounded-3xl p-6 border border-[#E3EAE5] shadow-card space-y-4">
            <div className="flex flex-col lg:flex-row gap-4 justify-between">
              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-[#66736B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search actor name, email, action, resource, IP..."
                  className="w-full pl-10 pr-10 py-2.5 bg-[#F3FAF5] border border-[#E3EAE5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16834A]/20 focus:border-[#16834A] transition"
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

              {/* Sort Order & Dates */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-[#66736B]">
                  <span>From:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPage(1);
                    }}
                    className="px-2.5 py-1.5 bg-[#F3FAF5] border border-[#E3EAE5] rounded-xl text-xs text-[#17231C] focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#66736B]">
                  <span>To:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPage(1);
                    }}
                    className="px-2.5 py-1.5 bg-[#F3FAF5] border border-[#E3EAE5] rounded-xl text-xs text-[#17231C] focus:outline-none"
                  />
                </div>

                <select
                  value={sortOrder}
                  onChange={(e) => {
                    setSortOrder(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 bg-[#F3FAF5] border border-[#E3EAE5] rounded-xl text-xs font-semibold text-[#17231C] focus:outline-none"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>

            {/* Filter Pills Grid */}
            <div className="pt-3 border-t border-[#E3EAE5] flex flex-wrap items-center gap-y-3 gap-x-6 text-xs">
              {/* Category Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-[#66736B] uppercase tracking-wider text-[11px]">
                  Category:
                </span>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'AUTH', label: 'Auth & Login' },
                  { id: 'USER_MGMT', label: 'User Mgmt' },
                  { id: 'BUSINESS_MGMT', label: 'Business Mgmt' },
                  { id: 'APPOINTMENT', label: 'Appointments' },
                  { id: 'SERVICE', label: 'Services' },
                  { id: 'SECURITY', label: 'Security' },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCategoryFilter(c.id);
                      setPage(1);
                    }}
                    className={`px-3 py-1 rounded-full font-semibold transition ${
                      categoryFilter === c.id
                        ? 'bg-[#16834A] text-white shadow-sm'
                        : 'bg-[#F3FAF5] text-[#66736B] hover:bg-[#EAF6EE] hover:text-[#16834A]'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-[#66736B] uppercase tracking-wider text-[11px]">
                  Result:
                </span>
                {['all', 'success', 'failure', 'blocked'].map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setStatusFilter(st);
                      setPage(1);
                    }}
                    className={`px-3 py-1 rounded-full font-semibold capitalize transition ${
                      statusFilter === st
                        ? 'bg-[#17231C] text-white shadow-sm'
                        : 'bg-[#F3FAF5] text-[#66736B] hover:bg-[#EAF6EE] hover:text-[#17231C]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Severity Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-[#66736B] uppercase tracking-wider text-[11px]">
                  Severity:
                </span>
                {['all', 'info', 'warning', 'critical'].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => {
                      setSeverityFilter(sev);
                      setPage(1);
                    }}
                    className={`px-3 py-1 rounded-full font-semibold capitalize transition ${
                      severityFilter === sev
                        ? 'bg-rose-700 text-white shadow-sm'
                        : 'bg-[#F3FAF5] text-[#66736B] hover:bg-[#EAF6EE] hover:text-rose-700'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-3xl border border-[#E3EAE5] shadow-card overflow-hidden">
            <div className="p-6 border-b border-[#E3EAE5] flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#17231C]">Audit Event Records</h2>
                <p className="text-xs text-[#66736B]">
                  Showing {logs.length} of {pagination.totalLogs} events
                </p>
              </div>

              <div className="text-xs text-[#66736B] flex items-center gap-2">
                <span>
                  Page <strong className="text-[#17231C]">{pagination.page}</strong> of{' '}
                  <strong className="text-[#17231C]">{pagination.totalPages}</strong>
                </span>
              </div>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#66736B]">
                <Loader2 className="w-8 h-8 text-[#16834A] animate-spin" />
                <span className="text-sm font-semibold">Loading audit logs from MongoDB...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-20 px-6 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-[#EAF6EE] text-[#16834A] flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-[#17231C]">No audit events found</h3>
                <p className="text-xs text-[#66736B] max-w-sm mx-auto">
                  No records match your selected filter criteria. Try resetting filters or expanding the date range.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setCategoryFilter('all');
                    setSeverityFilter('all');
                    setStatusFilter('all');
                    setStartDate('');
                    setEndDate('');
                    setPage(1);
                  }}
                >
                  Reset All Filters
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F3FAF5] border-b border-[#E3EAE5] text-[11px] font-bold uppercase tracking-wider text-[#66736B]">
                      <th className="py-3.5 px-6">Timestamp</th>
                      <th className="py-3.5 px-4">Actor</th>
                      <th className="py-3.5 px-4">Action</th>
                      <th className="py-3.5 px-4">Resource</th>
                      <th className="py-3.5 px-4">Result</th>
                      <th className="py-3.5 px-4">IP Address</th>
                      <th className="py-3.5 px-6 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3EAE5] text-sm">
                    {logs.map((log) => {
                      const catStyle = CATEGORY_MAP[log.actionCategory] || CATEGORY_MAP.SYSTEM;
                      const statusStyle = STATUS_STYLES[log.status] || STATUS_STYLES.success;
                      const sevStyle = SEVERITY_STYLES[log.severity] || SEVERITY_STYLES.info;

                      return (
                        <tr
                          key={log._id}
                          className="hover:bg-[#F3FAF5]/60 transition-colors group cursor-pointer"
                          onClick={() => handleOpenDetails(log)}
                        >
                          {/* Timestamp */}
                          <td className="py-4 px-6 whitespace-nowrap">
                            <div className="space-y-0.5">
                              <span className="font-semibold text-xs text-[#17231C] block">
                                {formatTimestamp(log.createdAt)}
                              </span>
                              <span className="text-[11px] text-[#66736B] block">
                                {timeAgo(log.createdAt)}
                              </span>
                            </div>
                          </td>

                          {/* Actor */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-[#17231C]">
                                  {log.actorName || 'System'}
                                </span>
                                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold uppercase">
                                  {log.actorRole || 'system'}
                                </span>
                              </div>
                              <span className="text-[11px] text-[#66736B] block truncate max-w-[180px]">
                                {log.actorEmail || 'system@queueless.com'}
                              </span>
                            </div>
                          </td>

                          {/* Action & Category */}
                          <td className="py-4 px-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                                >
                                  {catStyle.label}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${sevStyle.bg} ${sevStyle.text} ${sevStyle.border}`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${sevStyle.dot}`} />
                                  {sevStyle.label}
                                </span>
                              </div>
                              <span className="font-bold text-xs text-[#17231C] block truncate max-w-[200px]" title={log.action}>
                                {log.action}
                              </span>
                            </div>
                          </td>

                          {/* Resource */}
                          <td className="py-4 px-4">
                            <div className="space-y-0.5">
                              <span className="text-xs font-semibold text-[#17231C] block truncate max-w-[150px]">
                                {log.resourceName || log.resourceId || '—'}
                              </span>
                              <span className="text-[10px] text-[#66736B] block">
                                {log.resourceType || 'General'}
                              </span>
                            </div>
                          </td>

                          {/* Result */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                            >
                              {log.status === 'success' ? (
                                <Check className="w-3 h-3 text-[#16834A]" />
                              ) : (
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                              )}
                              {statusStyle.label}
                            </span>
                          </td>

                          {/* IP Address */}
                          <td className="py-4 px-4 whitespace-nowrap text-xs text-[#66736B]">
                            <code>{log.ipAddress || '127.0.0.1'}</code>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-6 text-right whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetails(log);
                              }}
                              className="p-1.5 rounded-lg text-[#66736B] hover:text-[#16834A] hover:bg-[#EAF6EE] transition"
                              title="Inspect Event Metadata"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {!loading && logs.length > 0 && (
              <div className="p-4 sm:p-6 border-t border-[#E3EAE5] bg-[#F3FAF5] flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-xs text-[#66736B]">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.totalLogs)} of{' '}
                  {pagination.totalLogs} audit records
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasPrevPage}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="gap-1 text-xs"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <span className="text-xs font-semibold text-[#17231C] px-3">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasNextPage}
                    onClick={() => setPage((p) => p + 1)}
                    className="gap-1 text-xs"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* AUDIT EVENT DETAILS MODAL / DRAWER                                        */}
      {/* ========================================================================= */}
      {modalOpen && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#E3EAE5] shadow-2xl p-6 sm:p-8 space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#E3EAE5] pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      CATEGORY_MAP[selectedLog.actionCategory]?.bg || 'bg-slate-100'
                    } ${
                      CATEGORY_MAP[selectedLog.actionCategory]?.text || 'text-slate-800'
                    }`}
                  >
                    {CATEGORY_MAP[selectedLog.actionCategory]?.label || selectedLog.actionCategory}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      STATUS_STYLES[selectedLog.status]?.bg || 'bg-slate-100'
                    } ${
                      STATUS_STYLES[selectedLog.status]?.text || 'text-slate-800'
                    }`}
                  >
                    {STATUS_STYLES[selectedLog.status]?.label || selectedLog.status}
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-[#17231C] mt-1">
                  {selectedLog.action}
                </h2>
                <p className="text-xs text-[#66736B]">
                  Event ID: <code className="bg-slate-100 px-1 py-0.5 rounded">{selectedLog._id}</code>
                </p>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-[#66736B] hover:text-[#17231C] hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Event Description */}
            {selectedLog.description && (
              <div className="bg-[#F3FAF5] p-4 rounded-2xl border border-[#E3EAE5] text-xs space-y-1">
                <span className="font-bold text-[#66736B] uppercase tracking-wider text-[11px] block">
                  Event Summary
                </span>
                <p className="text-sm font-semibold text-[#17231C] leading-relaxed">
                  {selectedLog.description}
                </p>
              </div>
            )}

            {/* Actor & Resource Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Actor Card */}
              <div className="bg-white p-4 rounded-2xl border border-[#E3EAE5] space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-[#16834A] uppercase tracking-wider text-[11px]">
                  <User className="w-4 h-4" />
                  Actor Information
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-[#17231C] text-sm">
                    {selectedLog.actorName || 'System'}
                  </p>
                  <p className="text-[#66736B]">{selectedLog.actorEmail || 'system@queueless.com'}</p>
                  <p className="text-[#66736B]">
                    Role: <strong className="capitalize text-[#17231C]">{selectedLog.actorRole}</strong>
                  </p>
                  {selectedLog.userId && (
                    <p className="text-[11px] text-[#66736B]">
                      User ID: <code>{selectedLog.userId}</code>
                    </p>
                  )}
                </div>
              </div>

              {/* Resource Card */}
              <div className="bg-white p-4 rounded-2xl border border-[#E3EAE5] space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-[#16834A] uppercase tracking-wider text-[11px]">
                  <Building2 className="w-4 h-4" />
                  Target Resource
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-[#17231C] text-sm">
                    {selectedLog.resourceName || selectedLog.resourceId || 'General System'}
                  </p>
                  <p className="text-[#66736B]">
                    Type: <strong className="text-[#17231C]">{selectedLog.resourceType || 'System'}</strong>
                  </p>
                  {selectedLog.resourceId && (
                    <p className="text-[11px] text-[#66736B]">
                      Resource ID: <code>{selectedLog.resourceId}</code>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Technical Telemetry */}
            <div className="bg-[#F3FAF5] p-4 rounded-2xl border border-[#E3EAE5] text-xs space-y-2">
              <span className="font-bold text-[#66736B] uppercase tracking-wider text-[11px] block">
                Technical Execution Details
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#17231C]">
                <div>
                  <span className="text-[#66736B]">Timestamp: </span>
                  <strong>{formatTimestamp(selectedLog.createdAt)}</strong>
                </div>
                <div>
                  <span className="text-[#66736B]">IP Address: </span>
                  <code>{selectedLog.ipAddress || '127.0.0.1'}</code>
                </div>
                <div>
                  <span className="text-[#66736B]">HTTP Method: </span>
                  <span className="bg-white px-2 py-0.5 rounded font-bold border border-[#E3EAE5]">
                    {selectedLog.method || 'GET'}
                  </span>
                </div>
                <div>
                  <span className="text-[#66736B]">Endpoint: </span>
                  <code>{selectedLog.endpoint || '—'}</code>
                </div>
                {selectedLog.userAgent && (
                  <div className="sm:col-span-2">
                    <span className="text-[#66736B]">User Agent: </span>
                    <span className="text-[11px] text-slate-700 block truncate" title={selectedLog.userAgent}>
                      {selectedLog.userAgent}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Previous vs Updated State Diff */}
            {(selectedLog.previousState || selectedLog.updatedState) && (
              <div className="space-y-2 text-xs">
                <span className="font-bold text-[#66736B] uppercase tracking-wider text-[11px] block">
                  State Change History
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200">
                    <span className="font-bold text-amber-800 block mb-1">Previous Values</span>
                    <pre className="text-[11px] text-amber-900 overflow-x-auto">
                      {JSON.stringify(selectedLog.previousState, null, 2)}
                    </pre>
                  </div>
                  <div className="bg-[#EAF6EE] p-3.5 rounded-xl border border-[#16834A]/25">
                    <span className="font-bold text-[#16834A] block mb-1">Updated Values</span>
                    <pre className="text-[11px] text-[#11643A] overflow-x-auto">
                      {JSON.stringify(selectedLog.updatedState, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Raw Metadata JSON Preview */}
            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#66736B] uppercase tracking-wider text-[11px]">
                    Sanitized Event Metadata
                  </span>
                  <button
                    onClick={handleCopyJson}
                    className="flex items-center gap-1 text-[11px] text-[#16834A] hover:underline"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>
                <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-2xl overflow-x-auto text-[11px] font-mono leading-relaxed">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            )}

            {/* Modal Footer */}
            <div className="border-t border-[#E3EAE5] pt-4 flex items-center justify-between">
              <span className="text-[11px] text-[#66736B]">
                Immutable record secured by MongoDB Atlas.
              </span>
              <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

