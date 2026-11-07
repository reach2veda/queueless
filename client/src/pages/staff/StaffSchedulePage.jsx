import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Ticket,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Building2,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckSquare,
  XCircle,
  Info,
  Briefcase,
  Phone,
  Filter,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardSidebar from '../../components/layout/DashboardSidebar';
import DashboardNavbar from '../../components/layout/DashboardNavbar';
import Button from '../../components/ui/Button';
import api from '../../services/api';
import { getSocket } from '../../services/socket';

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Compute the 7 dates (Monday to Sunday) for the week containing dateStr (YYYY-MM-DD)
 */
function getWeekDates(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const day = target.getUTCDay(); // 0 is Sun, 1 is Mon...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(target);
  monday.setUTCDate(target.getUTCDate() + diffToMonday);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const nextDay = new Date(monday);
    nextDay.setUTCDate(monday.getUTCDate() + i);
    days.push(nextDay.toISOString().slice(0, 10));
  }
  return days;
}

/**
 * Format date for friendly human reading
 */
function formatHumanDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default function StaffSchedulePage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Today ISO string
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // View & Date States
  const [viewMode, setViewMode] = useState('daily'); // 'daily' | 'weekly'
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Data States
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Filter States
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  const [searchQuery, setSearchQuery] = useState('');

  // Active week dates (Monday -> Sunday)
  const activeWeekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  // Fetch schedule from backend
  const fetchSchedule = useCallback(
    async (isManual = false) => {
      if (isManual) setIsRefreshing(true);
      setErrorMessage('');

      try {
        let endpoint = '/staff/schedule';
        const params = new URLSearchParams();

        if (viewMode === 'daily') {
          params.append('date', selectedDate);
        } else {
          params.append('startDate', activeWeekDates[0]);
          params.append('endDate', activeWeekDates[6]);
        }

        if (statusFilter && statusFilter !== 'all') {
          params.append('status', statusFilter);
        }

        const queryString = params.toString();
        if (queryString) {
          endpoint += `?${queryString}`;
        }

        const res = await api.get(endpoint);
        if (res.data?.success) {
          setScheduleData(res.data);
        } else {
          setErrorMessage('Failed to load schedule from server');
        }
      } catch (err) {
        console.error('Failed to load staff schedule:', err);
        const msg =
          err.response?.data?.error?.message ||
          err.message ||
          'Failed to load your appointments schedule';
        setErrorMessage(msg);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [viewMode, selectedDate, activeWeekDates, statusFilter]
  );

  // Load schedule on dependencies change
  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Real-time synchronization with Socket.IO
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleUpdate = () => {
      fetchSchedule();
    };

    socket.on('queue:updated', handleUpdate);
    socket.on('admin:queue-changed', handleUpdate);
    socket.on('appointment:updated', handleUpdate);

    return () => {
      socket.off('queue:updated', handleUpdate);
      socket.off('admin:queue-changed', handleUpdate);
      socket.off('appointment:updated', handleUpdate);
    };
  }, [fetchSchedule]);

  // Date Navigation Handlers
  const handlePrev = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    dt.setUTCDate(dt.getUTCDate() - (viewMode === 'weekly' ? 7 : 1));
    setSelectedDate(dt.toISOString().slice(0, 10));
  };

  const handleNext = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    dt.setUTCDate(dt.getUTCDate() + (viewMode === 'weekly' ? 7 : 1));
    setSelectedDate(dt.toISOString().slice(0, 10));
  };

  const handleToday = () => {
    setSelectedDate(todayStr);
  };

  // Staff and Business details from response
  const staff = scheduleData?.staff;
  const business = scheduleData?.business;
  const stats = scheduleData?.stats || { total: 0, confirmed: 0, checkedIn: 0, completed: 0, cancelled: 0 };
  const rawAppointments = scheduleData?.appointments || [];

  // Filter appointments locally by search query
  const filteredAppointments = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return rawAppointments;

    return rawAppointments.filter((apt) => {
      const custName = apt.customerId?.name?.toLowerCase() || '';
      const ref = apt.bookingReference?.toLowerCase() || '';
      const token = apt.tokenNumber?.toLowerCase() || '';
      const srvName = apt.serviceId?.name?.toLowerCase() || '';
      const phone = apt.customerId?.phone?.toLowerCase() || '';

      return (
        custName.includes(q) ||
        ref.includes(q) ||
        token.includes(q) ||
        srvName.includes(q) ||
        phone.includes(q)
      );
    });
  }, [rawAppointments, searchQuery]);

  // Check if a specific date is configured as a working day for this staff member
  const isWorkingDay = (dateStr) => {
    if (!staff?.workingDays) return false;
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const dayOfWeek = dt.getUTCDay();
    return staff.workingDays.includes(dayOfWeek);
  };

  return (
    <div className="min-h-screen bg-[#F3FAF5] flex">
      {/* Sidebar */}
      <DashboardSidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardNavbar title="Staff Schedule & Roster" toggleSidebar={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Header Banner */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#16834A] bg-[#EAF6EE] px-2.5 py-1 rounded-full">
                  Assigned Practitioner Roster
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {staff?.title || 'Staff Member'}
                </span>
                {business?.name && (
                  <span className="text-xs font-semibold text-[#66736B] flex items-center space-x-1">
                    <Building2 className="w-3.5 h-3.5 text-[#16834A]" />
                    <span>{business.name}</span>
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-extrabold text-[#17231C]">
                {staff?.name || user?.name || 'Staff Schedule'}
              </h2>

              <p className="text-xs sm:text-sm text-[#66736B]">
                Configured Shift:{' '}
                <strong className="text-[#17231C]">
                  {staff?.workingHours?.start || '09:00'} - {staff?.workingHours?.end || '17:00'}
                </strong>{' '}
                • Working Days:{' '}
                <span className="font-semibold text-[#16834A]">
                  {staff?.workingDays && staff.workingDays.length > 0
                    ? staff.workingDays
                        .slice()
                        .sort()
                        .map((d) => DAY_SHORT[d])
                        .join(', ')
                    : 'Monday - Friday'}
                </span>
              </p>
            </div>

            <div className="flex items-center space-x-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchSchedule(true)}
                isLoading={isRefreshing}
                leftIcon={<RefreshCw className="w-4 h-4 text-[#16834A]" />}
              >
                Refresh
              </Button>
              <Link to="/staff/check-in">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<CheckSquare className="w-4 h-4" />}
                >
                  Front Desk Check-In
                </Button>
              </Link>
            </div>
          </div>

          {/* KPI Metrics Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E3EAE5] shadow-card space-y-1">
              <span className="text-xs font-semibold text-[#66736B] flex items-center space-x-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-[#16834A]" />
                <span>Scheduled Total</span>
              </span>
              <p className="text-2xl font-extrabold text-[#17231C]">{stats.total}</p>
            </div>

            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E3EAE5] shadow-card space-y-1">
              <span className="text-xs font-semibold text-[#66736B] flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Awaiting (Confirmed)</span>
              </span>
              <p className="text-2xl font-extrabold text-blue-700">{stats.confirmed}</p>
            </div>

            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E3EAE5] shadow-card space-y-1">
              <span className="text-xs font-semibold text-[#66736B] flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-[#16834A] animate-ping" />
                <span>In Queue (Checked In)</span>
              </span>
              <p className="text-2xl font-extrabold text-[#11643A]">{stats.checkedIn}</p>
            </div>

            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E3EAE5] shadow-card space-y-1">
              <span className="text-xs font-semibold text-[#66736B] flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Concluded / Cancelled</span>
              </span>
              <p className="text-2xl font-extrabold text-slate-700">
                {stats.completed}{' '}
                <span className="text-xs font-normal text-rose-600">
                  ({stats.cancelled} cancelled)
                </span>
              </p>
            </div>
          </div>

          {/* Configured Working Days Visual Roster */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E3EAE5] shadow-card space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E3EAE5]">
              <div className="flex items-center space-x-2">
                <Briefcase className="w-4 h-4 text-[#16834A]" />
                <h3 className="font-extrabold text-sm sm:text-base text-[#17231C]">
                  Configured Shift Roster & Working Days
                </h3>
              </div>
              <span className="text-[11px] text-[#66736B] flex items-center space-x-1">
                <Info className="w-3.5 h-3.5 text-[#16834A]" />
                <span>Shift hours configured in MongoDB by business administration</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-7 gap-2.5">
              {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
                const isWorking = staff?.workingDays?.includes(dayIdx);
                const isCurrentDay = new Date().getDay() === dayIdx;

                return (
                  <div
                    key={dayIdx}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      isCurrentDay
                        ? 'ring-2 ring-[#16834A] ring-offset-1'
                        : ''
                    } ${
                      isWorking
                        ? 'bg-[#F3FAF5] border-[#16834A]/30 text-[#11643A]'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {DAY_SHORT[dayIdx]}
                      </span>
                      {isCurrentDay && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#16834A]" title="Today" />
                      )}
                    </div>
                    <div className="mt-1">
                      {isWorking ? (
                        <span className="text-[11px] font-mono font-semibold block text-[#16834A]">
                          {staff?.workingHours?.start || '09:00'} -{' '}
                          {staff?.workingHours?.end || '17:00'}
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium block text-slate-400">
                          Rest / Off Day
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Controls Bar: View Toggle, Date Navigation, and Filters */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E3EAE5] shadow-card space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Left: View Mode Toggle */}
              <div className="flex items-center space-x-2">
                <div className="bg-[#F3FAF5] p-1 rounded-2xl border border-[#E3EAE5] flex items-center">
                  <button
                    onClick={() => setViewMode('daily')}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      viewMode === 'daily'
                        ? 'bg-white text-[#11643A] shadow-sm'
                        : 'text-[#66736B] hover:text-[#17231C]'
                    }`}
                  >
                    Daily Schedule
                  </button>
                  <button
                    onClick={() => setViewMode('weekly')}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      viewMode === 'weekly'
                        ? 'bg-white text-[#11643A] shadow-sm'
                        : 'text-[#66736B] hover:text-[#17231C]'
                    }`}
                  >
                    Weekly Calendar
                  </button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToday}
                  className="text-xs font-bold text-[#16834A]"
                >
                  Jump to Today
                </Button>
              </div>

              {/* Middle: Date Navigation */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrev}
                  className="p-2 rounded-xl border border-[#E3EAE5] bg-white text-[#66736B] hover:text-[#17231C] hover:bg-[#F3FAF5] transition"
                  aria-label="Previous"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#F3FAF5] border border-[#E3EAE5]">
                  <CalendarIcon className="w-4 h-4 text-[#16834A]" />
                  <span className="text-xs font-extrabold text-[#17231C]">
                    {viewMode === 'daily'
                      ? formatHumanDate(selectedDate)
                      : `${formatHumanDate(activeWeekDates[0])} — ${formatHumanDate(activeWeekDates[6])}`}
                  </span>
                </div>

                <button
                  onClick={handleNext}
                  className="p-2 rounded-xl border border-[#E3EAE5] bg-white text-[#66736B] hover:text-[#17231C] hover:bg-[#F3FAF5] transition"
                  aria-label="Next"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Date Picker Input */}
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-[#E3EAE5] text-xs font-medium bg-white text-[#17231C] focus:outline-none focus:ring-2 focus:ring-[#16834A]/20"
                />
              </div>

              {/* Right: Search Filter Input */}
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 text-[#66736B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search customer, ref, token..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E3EAE5] text-xs font-medium placeholder-[#66736B] focus:outline-none focus:ring-2 focus:ring-[#16834A]/20"
                />
              </div>
            </div>

            {/* Status Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E3EAE5]">
              <span className="text-xs font-semibold text-[#66736B] mr-1 flex items-center space-x-1">
                <Filter className="w-3.5 h-3.5" />
                <span>Filter Status:</span>
              </span>

              {[
                { id: 'all', label: 'All Statuses' },
                { id: 'confirmed', label: 'Confirmed / Awaiting' },
                { id: 'in_progress', label: 'In Queue' },
                { id: 'completed', label: 'Completed' },
                { id: 'cancelled', label: 'Cancelled' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setStatusFilter(pill.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === pill.id
                      ? 'bg-[#16834A] text-white shadow-sm'
                      : 'bg-[#F3FAF5] text-[#66736B] hover:text-[#17231C] border border-[#E3EAE5]'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Appointment Schedule View */}
          {loading ? (
            <div className="bg-white rounded-3xl p-12 border border-[#E3EAE5] text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#16834A] animate-spin mx-auto" />
              <p className="text-sm font-semibold text-[#17231C]">Loading your schedule roster...</p>
            </div>
          ) : errorMessage ? (
            <div className="bg-white rounded-3xl p-8 border border-red-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-base text-[#17231C]">Could Not Load Schedule</h4>
              <p className="text-xs text-[#66736B] max-w-md mx-auto">{errorMessage}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchSchedule(true)}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Retry Loading
              </Button>
            </div>
          ) : viewMode === 'daily' ? (
            /* ================= DAILY TIMELINE VIEW ================= */
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#E3EAE5]">
                <div className="space-y-0.5">
                  <h3 className="font-extrabold text-base text-[#17231C]">
                    Daily Schedule for {formatHumanDate(selectedDate)}
                  </h3>
                  <p className="text-xs text-[#66736B]">
                    {isWorkingDay(selectedDate) ? (
                      <span className="text-[#16834A] font-semibold">
                        On Duty Shift ({staff?.workingHours?.start} - {staff?.workingHours?.end})
                      </span>
                    ) : (
                      <span className="text-slate-400 font-semibold">
                        Scheduled Rest / Non-Working Day
                      </span>
                    )}
                  </p>
                </div>

                <span className="text-xs font-bold text-[#16834A] bg-[#EAF6EE] px-3 py-1 rounded-full">
                  {filteredAppointments.length} appointment
                  {filteredAppointments.length === 1 ? '' : 's'}
                </span>
              </div>

              {filteredAppointments.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#EAF6EE] text-[#16834A] flex items-center justify-center mx-auto border border-[#16834A]/20">
                    <CalendarCheck2 className="w-7 h-7" />
                  </div>
                  <h4 className="font-extrabold text-base text-[#17231C]">
                    No Appointments Scheduled
                  </h4>
                  <p className="text-xs text-[#66736B] max-w-sm mx-auto">
                    There are no appointments assigned to your schedule on this date matching the
                    selected filter.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {filteredAppointments.map((apt) => {
                    const isCheckedIn = apt.isCheckedIn || apt.status === 'in_progress';
                    const isConfirmed =
                      !apt.isCheckedIn && ['confirmed', 'approved', 'pending'].includes(apt.status);
                    const isCompleted = apt.status === 'completed';
                    const isCancelled = apt.status === 'cancelled';

                    return (
                      <div
                        key={apt._id}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                          isCancelled
                            ? 'bg-rose-50/40 border-rose-200'
                            : isCheckedIn
                            ? 'bg-[#F3FAF5] border-[#16834A]/30 shadow-sm'
                            : isCompleted
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-white border-[#E3EAE5] hover:border-[#16834A]/40'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          {/* Left: Time & Customer */}
                          <div className="flex items-start space-x-3.5">
                            <div className="p-2.5 rounded-xl bg-white border border-[#E3EAE5] text-center min-w-[70px] shrink-0">
                              <span className="font-mono text-xs font-extrabold text-[#17231C] block">
                                {apt.startTime}
                              </span>
                              <span className="text-[10px] text-[#66736B] block">
                                - {apt.endTime}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-extrabold text-sm text-[#17231C]">
                                  {apt.customerId?.name || 'Walk-in Customer'}
                                </h4>
                                <span className="text-xs font-mono font-bold text-[#11643A] bg-[#EAF6EE] px-2 py-0.5 rounded-lg border border-[#16834A]/20">
                                  {apt.tokenNumber || 'Token N/A'}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#66736B]">
                                <span className="font-medium text-[#17231C]">
                                  {apt.serviceId?.name || 'Consultation'}
                                </span>
                                <span>•</span>
                                <span>Ref: <strong className="font-mono">{apt.bookingReference}</strong></span>
                                {apt.customerId?.phone && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center space-x-1">
                                      <Phone className="w-3 h-3 text-[#16834A]" />
                                      <span>{apt.customerId.phone}</span>
                                    </span>
                                  </>
                                )}
                              </div>

                              {apt.notes && (
                                <p className="text-[11px] text-[#66736B] italic pt-0.5">
                                  "{apt.notes}"
                                </p>
                              )}

                              {isCancelled && apt.cancellationReason && (
                                <p className="text-xs text-rose-700 font-semibold pt-1">
                                  Cancellation reason: {apt.cancellationReason}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Right: Status Pill & Check-In Link */}
                          <div className="flex items-center space-x-3 self-start sm:self-center">
                            {isConfirmed && (
                              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Confirmed Arrival</span>
                              </span>
                            )}

                            {isCheckedIn && (
                              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-[#EAF6EE] text-[#11643A] border border-[#16834A]/20">
                                <span className="w-2 h-2 rounded-full bg-[#16834A] animate-ping" />
                                <span>In Queue ({apt.queueStatus || 'waiting'})</span>
                              </span>
                            )}

                            {isCompleted && (
                              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                                <span>Concluded</span>
                              </span>
                            )}

                            {isCancelled && (
                              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Cancelled</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ================= WEEKLY 7-DAY CALENDAR VIEW ================= */
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E3EAE5]">
                <h3 className="font-extrabold text-base text-[#17231C]">
                  Weekly Schedule Grid ({formatHumanDate(activeWeekDates[0])} -{' '}
                  {formatHumanDate(activeWeekDates[6])})
                </h3>
                <span className="text-xs text-[#66736B]">
                  Click any day to view its detailed roster
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                {activeWeekDates.map((dateStr) => {
                  const [y, m, d] = dateStr.split('-').map(Number);
                  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
                  const dayIdx = dt.getUTCDay();
                  const isWorking = isWorkingDay(dateStr);
                  const isCurrentDay = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;

                  // Appointments on this day
                  const dayAppointments = filteredAppointments.filter(
                    (a) => a.appointmentDate === dateStr
                  );

                  return (
                    <div
                      key={dateStr}
                      onClick={() => {
                        setSelectedDate(dateStr);
                        setViewMode('daily');
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer min-h-[220px] flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#16834A] ring-2 ring-[#16834A]/20'
                          : 'border-[#E3EAE5] hover:border-[#16834A]/30'
                      } ${
                        isCurrentDay
                          ? 'bg-[#F3FAF5]'
                          : isWorking
                          ? 'bg-white'
                          : 'bg-slate-50/60'
                      }`}
                    >
                      {/* Column Header */}
                      <div className="space-y-1 pb-2 border-b border-[#E3EAE5]">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#17231C]">
                            {DAY_SHORT[dayIdx]}
                          </span>
                          <span className="text-[11px] font-mono text-[#66736B]">
                            {dateStr.slice(5)}
                          </span>
                        </div>

                        <div>
                          {isWorking ? (
                            <span className="text-[10px] font-bold text-[#16834A] bg-[#EAF6EE] px-1.5 py-0.5 rounded">
                              On Duty
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              Off
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Appointments List for Day */}
                      <div className="flex-1 my-2 space-y-1.5 overflow-y-auto max-h-[140px]">
                        {dayAppointments.length === 0 ? (
                          <span className="text-[11px] text-slate-400 block pt-4 text-center">
                            No arrivals
                          </span>
                        ) : (
                          dayAppointments.map((apt) => (
                            <div
                              key={apt._id}
                              className={`p-1.5 rounded-lg text-[10px] border leading-tight ${
                                apt.status === 'cancelled'
                                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                                  : apt.isCheckedIn || apt.status === 'in_progress'
                                  ? 'bg-[#EAF6EE] border-[#16834A]/30 text-[#11643A]'
                                  : apt.status === 'completed'
                                  ? 'bg-slate-100 border-slate-200 text-slate-600'
                                  : 'bg-blue-50 border-blue-200 text-blue-700'
                              }`}
                            >
                              <div className="font-mono font-bold flex justify-between">
                                <span>{apt.startTime}</span>
                                <span>{apt.tokenNumber || 'QL---'}</span>
                              </div>
                              <div className="truncate font-semibold mt-0.5">
                                {apt.customerId?.name || 'Customer'}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Column Footer */}
                      <div className="pt-1 border-t border-[#E3EAE5] text-[10px] text-center font-bold text-[#16834A]">
                        {dayAppointments.length} arrival{dayAppointments.length === 1 ? '' : 's'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

