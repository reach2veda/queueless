import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckSquare,
  Users,
  Clock,
  Ticket,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Calendar,
  Building2,
  UserCheck,
  Phone,
  Mail,
  Loader2,
  XCircle,
  ArrowRight,
  Radio,
  PlusCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardSidebar from '../../components/layout/DashboardSidebar';
import DashboardNavbar from '../../components/layout/DashboardNavbar';
import Button from '../../components/ui/Button';
import api from '../../services/api';
import { getSocket } from '../../services/socket';

export default function StaffCheckInPage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [todayDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Data States
  const [appointments, setAppointments] = useState([]);
  const [liveQueue, setLiveQueue] = useState(null);
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [checkingInId, setCheckingInId] = useState(null);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'awaiting' | 'checked_in' | 'completed'

  // Notifications
  const [successNotice, setSuccessNotice] = useState('');
  const [errorNotice, setErrorNotice] = useState('');

  const showSuccess = (msg) => {
    setSuccessNotice(msg);
    setTimeout(() => setSuccessNotice(''), 5000);
  };

  // Fetch today's appointments for the staff member's business
  const fetchTodayAppointments = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    setErrorNotice('');

    try {
      const res = await api.get(`/appointments/business/all?date=${todayDate}`);
      if (res.data?.success) {
        setAppointments(res.data.appointments || []);
        if (res.data.businessName) {
          setBusinessName(res.data.businessName);
        }
      }
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.message ||
        "Failed to load today's scheduled arrivals";
      setErrorNotice(msg);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [todayDate]);

  // Fetch live queue status for the business
  const fetchLiveQueue = useCallback(async () => {
    try {
      const res = await api.get(`/queues/admin/live?date=${todayDate}`);
      if (res.data?.success) {
        setLiveQueue(res.data);
      }
    } catch (err) {
      console.warn('Failed to fetch live queue for check-in terminal:', err);
    }
  }, [todayDate]);

  // Combined fetch handler
  const refreshAll = useCallback((isManual = false) => {
    fetchTodayAppointments(isManual);
    fetchLiveQueue();
  }, [fetchTodayAppointments, fetchLiveQueue]);

  // Initial load and Socket.IO real-time binding
  useEffect(() => {
    refreshAll();

    let socket = null;
    try {
      socket = getSocket();
      const handleRealtimeUpdate = () => {
        refreshAll(false);
      };

      socket.on('queue:updated', handleRealtimeUpdate);
      socket.on('admin:queue-changed', handleRealtimeUpdate);
      socket.on('user:ticket-updated', handleRealtimeUpdate);
    } catch (err) {
      console.warn('Socket error in StaffCheckInPage:', err);
    }

    return () => {
      if (socket) {
        socket.off('queue:updated');
        socket.off('admin:queue-changed');
        socket.off('user:ticket-updated');
      }
    };
  }, [refreshAll]);

  // Handle Customer Check-In
  const handleCheckIn = async (apt) => {
    setCheckingInId(apt._id);
    setErrorNotice('');
    setSuccessNotice('');

    try {
      const res = await api.post('/queues/check-in', {
        appointmentId: apt._id,
      });

      if (res.data?.success) {
        const customerName = apt.customerId?.name || 'Customer';
        const tokenNumber = apt.tokenNumber || res.data.entry?.ticketNumber;
        showSuccess(
          `Customer ${customerName} checked in successfully! Token ${tokenNumber} is now active in the virtual queue.`
        );
        // Refresh local data immediately
        refreshAll(false);
      }
    } catch (err) {
      const errMsg =
        err.response?.data?.error?.message ||
        err.message ||
        'Check-in failed. Please verify appointment status.';
      setErrorNotice(errMsg);
    } finally {
      setCheckingInId(null);
    }
  };

  // Search & Filter Logic
  const filteredAppointments = appointments.filter((apt) => {
    const custName = apt.customerId?.name?.toLowerCase() || '';
    const refCode = apt.bookingReference?.toLowerCase() || '';
    const phone = apt.customerId?.phone?.toLowerCase() || '';
    const token = apt.tokenNumber?.toLowerCase() || '';
    const srvName = apt.serviceId?.name?.toLowerCase() || '';
    const query = searchQuery.toLowerCase().trim();

    const matchesSearch =
      !query ||
      custName.includes(query) ||
      refCode.includes(query) ||
      phone.includes(query) ||
      token.includes(query) ||
      srvName.includes(query);

    if (!matchesSearch) return false;

    if (filterTab === 'awaiting') {
      return !apt.isCheckedIn && ['confirmed', 'approved', 'pending'].includes(apt.status);
    }
    if (filterTab === 'checked_in') {
      return apt.isCheckedIn || apt.status === 'in_progress';
    }
    if (filterTab === 'completed') {
      return apt.status === 'completed';
    }
    return true; // 'all'
  });

  // KPI Calculations
  const totalScheduled = appointments.length;
  const awaitingCount = appointments.filter(
    (a) => !a.isCheckedIn && ['confirmed', 'approved', 'pending'].includes(a.status)
  ).length;
  const checkedInCount = appointments.filter(
    (a) => a.isCheckedIn || a.status === 'in_progress'
  ).length;
  const completedCount = appointments.filter((a) => a.status === 'completed').length;

  return (
    <div className="min-h-screen bg-[#F3FAF5] flex">
      {/* Sidebar */}
      <DashboardSidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardNavbar title="Customer Check-In Terminal" toggleSidebar={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Header Banner */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#16834A] bg-[#EAF6EE] px-2.5 py-1 rounded-full">
                  Front Desk Check-In
                </span>
                <span className="text-xs font-semibold text-[#66736B] flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-[#16834A]" />
                  <span>Today: {todayDate}</span>
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-[#17231C]">
                {businessName || 'Front Desk Customer Check-In'}
              </h2>
              <p className="text-xs sm:text-sm text-[#66736B]">
                Operating Staff: <strong className="text-[#17231C]">{user?.name || 'Staff Member'}</strong>. Verify arriving customers and issue instant virtual queue passes.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => refreshAll(true)}
                disabled={loading || isRefreshing}
                title="Refresh arrivals & queue"
                className="p-2.5 rounded-xl border border-[#E3EAE5] bg-white text-[#66736B] hover:text-[#16834A] hover:bg-[#EAF6EE] transition-colors disabled:opacity-50 flex items-center space-x-1.5 text-xs font-semibold"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#16834A]' : ''}`} />
                <span>Refresh</span>
              </button>

              <Link to="/customer/explore">
                <Button variant="outline" size="sm" leftIcon={<PlusCircle className="w-4 h-4" />}>
                  Walk-In Booking
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-[#E3EAE5] shadow-card space-y-1">
              <span className="text-xs font-semibold text-[#66736B]">Scheduled Today</span>
              <h3 className="text-2xl font-extrabold text-[#17231C]">{totalScheduled}</h3>
              <p className="text-[11px] text-[#66736B]">Total appointments</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-[#E3EAE5] shadow-card space-y-1">
              <span className="text-xs font-semibold text-[#66736B]">Awaiting Arrival</span>
              <h3 className="text-2xl font-extrabold text-amber-700">{awaitingCount}</h3>
              <p className="text-[11px] text-amber-600 font-medium">Ready to check in</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-[#E3EAE5] shadow-card space-y-1">
              <span className="text-xs font-semibold text-[#66736B]">In Queue / Waiting</span>
              <h3 className="text-2xl font-extrabold text-[#16834A]">{liveQueue?.totalWaiting ?? checkedInCount}</h3>
              <p className="text-[11px] text-[#16834A] font-medium">Checked in customers</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-[#E3EAE5] shadow-card space-y-1">
              <span className="text-xs font-semibold text-[#66736B]">Currently Serving</span>
              <h3 className="text-xl font-extrabold text-[#11643A] truncate font-mono">
                {liveQueue?.currentlyServingToken && liveQueue.currentlyServingToken !== 'None (Queue Idle)'
                  ? liveQueue.currentlyServingToken
                  : 'Queue Idle'}
              </h3>
              <p className="text-[11px] text-[#66736B]">Completed: {completedCount}</p>
            </div>
          </div>

          {/* Success Alert Banner */}
          {successNotice && (
            <div className="p-4 rounded-2xl bg-[#EAF6EE] border border-[#16834A]/20 text-[#11643A] text-xs flex items-center justify-between font-semibold shadow-xs">
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-5 h-5 text-[#16834A] shrink-0" />
                <span>{successNotice}</span>
              </div>
              <button onClick={() => setSuccessNotice('')} className="p-1 hover:text-[#17231C]">
                &times;
              </button>
            </div>
          )}

          {/* Error Alert Banner */}
          {errorNotice && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between font-semibold shadow-xs">
              <div className="flex items-center space-x-2.5">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{errorNotice}</span>
              </div>
              <button onClick={() => setErrorNotice('')} className="p-1 hover:text-rose-900">
                &times;
              </button>
            </div>
          )}

          {/* Main Layout Grid: Scheduled Arrivals (Col 8) vs Live Queue Feed (Col 4) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT: Scheduled Arrivals Check-in (Col 8) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-white rounded-3xl p-6 border border-[#E3EAE5] shadow-card space-y-4">
                {/* Search Bar & Filter Tabs */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-[#66736B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search customer name, phone, ref, token..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E3EAE5] bg-[#F3FAF5] text-xs focus:outline-none focus:ring-2 focus:ring-[#16834A]/25 focus:border-[#16834A]"
                    />
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto">
                    <button
                      onClick={() => setFilterTab('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        filterTab === 'all'
                          ? 'bg-[#16834A] text-white shadow-soft-sm'
                          : 'bg-white text-[#66736B] border border-[#E3EAE5] hover:bg-slate-50'
                      }`}
                    >
                      All ({totalScheduled})
                    </button>

                    <button
                      onClick={() => setFilterTab('awaiting')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        filterTab === 'awaiting'
                          ? 'bg-amber-600 text-white shadow-soft-sm'
                          : 'bg-white text-[#66736B] border border-[#E3EAE5] hover:bg-slate-50'
                      }`}
                    >
                      Awaiting ({awaitingCount})
                    </button>

                    <button
                      onClick={() => setFilterTab('checked_in')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        filterTab === 'checked_in'
                          ? 'bg-[#16834A] text-white shadow-soft-sm'
                          : 'bg-white text-[#66736B] border border-[#E3EAE5] hover:bg-slate-50'
                      }`}
                    >
                      In Queue ({checkedInCount})
                    </button>

                    <button
                      onClick={() => setFilterTab('completed')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        filterTab === 'completed'
                          ? 'bg-slate-700 text-white shadow-soft-sm'
                          : 'bg-white text-[#66736B] border border-[#E3EAE5] hover:bg-slate-50'
                      }`}
                    >
                      Done ({completedCount})
                    </button>
                  </div>
                </div>

                {/* Arrivals List */}
                {loading ? (
                  <div className="py-16 text-center space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-[#16834A] mx-auto" />
                    <p className="text-sm font-semibold text-[#17231C]">Loading today's scheduled arrivals...</p>
                    <p className="text-xs text-[#66736B]">Synchronizing appointments from MongoDB</p>
                  </div>
                ) : appointments.length === 0 ? (
                  <div className="p-12 rounded-2xl bg-[#F3FAF5] border border-[#E3EAE5] text-center space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-[#EAF6EE] text-[#16834A] flex items-center justify-center mx-auto border border-[#16834A]/20">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-base text-[#17231C]">No Appointments Scheduled for Today</h4>
                    <p className="text-xs text-[#66736B] max-w-sm mx-auto leading-relaxed">
                      There are no customer bookings scheduled for {todayDate}. Walk-in customers can be booked directly through the portal.
                    </p>
                  </div>
                ) : filteredAppointments.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-[#F3FAF5] border border-[#E3EAE5] text-center space-y-1">
                    <p className="text-sm font-semibold text-[#17231C]">No arrivals match your search or filter</p>
                    <p className="text-xs text-[#66736B]">Try adjusting your search keywords or filter tab.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredAppointments.map((apt) => {
                      const isCompleted = apt.status === 'completed';
                      const isCancelled = apt.status === 'cancelled';
                      const isCheckedIn = apt.isCheckedIn || apt.status === 'in_progress';
                      const isEligible = !isCheckedIn && !isCompleted && !isCancelled;
                      const isProcessing = checkingInId === apt._id;

                      return (
                        <div
                          key={apt._id}
                          className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                            isCheckedIn
                              ? 'bg-[#EAF6EE]/30 border-[#16834A]/30'
                              : isCompleted
                              ? 'bg-slate-50 border-slate-200 opacity-75'
                              : isCancelled
                              ? 'bg-rose-50/50 border-rose-200 opacity-60'
                              : 'bg-[#F3FAF5] border-[#E3EAE5] hover:border-[#16834A]/40'
                          }`}
                        >
                          {/* Left: Customer & Booking Info */}
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              {/* Token Badge */}
                              <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-lg bg-[#16834A] text-white shadow-xs">
                                {apt.tokenNumber || 'QL---'}
                              </span>

                              {/* Customer Name */}
                              <h4 className="font-bold text-sm text-[#17231C] truncate">
                                {apt.customerId?.name || 'Customer'}
                              </h4>

                              {/* Booking Reference */}
                              <span className="font-mono text-[11px] text-[#66736B]">
                                ({apt.bookingReference})
                              </span>
                            </div>

                            {/* Service & Time */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#66736B]">
                              <span className="font-semibold text-[#17231C] flex items-center space-x-1">
                                <span>{apt.serviceId?.name || 'General Consultation'}</span>
                              </span>
                              <span>•</span>
                              <span className="flex items-center space-x-1 text-[#11643A] font-semibold">
                                <Clock className="w-3.5 h-3.5" />
                                <span>
                                  {apt.startTime} – {apt.endTime}
                                </span>
                              </span>
                              {apt.customerId?.phone && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center space-x-1 text-[#66736B]">
                                    <Phone className="w-3 h-3 text-[#16834A]" />
                                    <span>{apt.customerId.phone}</span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Right: Status & Action Button */}
                          <div className="flex items-center space-x-2 shrink-0">
                            {isEligible ? (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleCheckIn(apt)}
                                isLoading={isProcessing}
                                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                              >
                                Check In
                              </Button>
                            ) : isCheckedIn ? (
                              <div className="flex items-center space-x-2">
                                <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#EAF6EE] text-[#11643A] border border-[#16834A]/20">
                                  <span className="w-2 h-2 rounded-full bg-[#16834A] animate-ping" />
                                  <span>In Queue ({apt.queueStatus || 'waiting'})</span>
                                </span>
                              </div>
                            ) : isCompleted ? (
                              <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                Concluded
                              </span>
                            ) : isCancelled ? (
                              <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                Cancelled
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Live Queue Status Feed (Col 4) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white rounded-3xl p-6 border border-[#E3EAE5] shadow-card space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E3EAE5]">
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 rounded-lg bg-[#EAF6EE] text-[#16834A]">
                      <Radio className="w-4 h-4" />
                    </span>
                    <h3 className="font-extrabold text-base text-[#17231C]">Live Virtual Queue</h3>
                  </div>
                  <span className="text-[11px] font-semibold text-[#16834A] flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-[#16834A] animate-ping" />
                    <span>Live Feed</span>
                  </span>
                </div>

                {/* Currently Serving Box */}
                <div className="p-4 rounded-2xl bg-[#F3FAF5] border border-[#E3EAE5] space-y-2">
                  <span className="text-xs font-semibold text-[#66736B]">Now Serving at Counter</span>
                  <div className="flex items-center justify-between">
                    <h4 className="font-mono text-2xl font-extrabold text-[#11643A]">
                      {liveQueue?.currentlyServingToken && liveQueue.currentlyServingToken !== 'None (Queue Idle)'
                        ? liveQueue.currentlyServingToken
                        : 'Queue Idle'}
                    </h4>
                    <span className="text-xs font-bold text-[#16834A] bg-white px-2.5 py-1 rounded-lg border border-[#E3EAE5]">
                      Counter 1
                    </span>
                  </div>
                  {liveQueue?.currentlyServing?.customerName && (
                    <p className="text-xs font-semibold text-[#17231C]">
                      Customer: {liveQueue.currentlyServing.customerName}
                    </p>
                  )}
                </div>

                {/* Waiting List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#17231C]">
                    <span>Waiting in Queue</span>
                    <span className="text-[#16834A]">{liveQueue?.waitingList?.length || 0} waiting</span>
                  </div>

                  {!liveQueue?.waitingList || liveQueue.waitingList.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[#66736B] bg-[#F3FAF5] rounded-xl border border-[#E3EAE5]">
                      No customers currently waiting in queue.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {liveQueue.waitingList.slice(0, 6).map((item, idx) => (
                        <div
                          key={item._id}
                          className="p-2.5 rounded-xl bg-[#F3FAF5] border border-[#E3EAE5] flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="w-5 h-5 rounded-full bg-[#EAF6EE] text-[#16834A] font-bold text-[10px] flex items-center justify-center">
                              #{idx + 1}
                            </span>
                            <span className="font-mono font-bold text-[#17231C]">{item.ticketNumber}</span>
                            <span className="text-[#66736B] truncate max-w-[100px]">
                              {item.customerName || 'Customer'}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#16834A] font-medium">
                            ~{item.estimatedWaitMinutes ?? 5}m wait
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Terminal Link */}
                <div className="pt-2 border-t border-[#E3EAE5]">
                  <Link to="/staff/dashboard">
                    <Button variant="outline" size="sm" className="w-full" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                      Open Operator Terminal
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

