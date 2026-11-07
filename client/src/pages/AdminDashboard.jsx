import React, { useState, useEffect } from 'react';
import {
  CalendarCheck2,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  Building2,
  Search,
  Filter,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  Loader2,
  Ticket,
  UserCheck,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DashboardSidebar from '../components/layout/DashboardSidebar';
import DashboardNavbar from '../components/layout/DashboardNavbar';
import Button from '../components/ui/Button';
import LiveQueueTerminal from '../components/admin/LiveQueueTerminal';
import api from '../services/api';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Stats State
  const [stats, setStats] = useState({
    totalAppointments: 0,
    pendingAppointments: 0,
    approvedAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    totalUsers: 0,
    totalBusinesses: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Appointments State
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // UI Feedback States
  const [actionMessage, setActionMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  // Fetch KPI Stats from backend
  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await api.get('/admin/stats');
      if (res.data?.success && res.data?.stats) {
        setStats(res.data.stats);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to fetch platform statistics');
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch Appointments from backend
  const fetchAppointments = async () => {
    try {
      setLoadingAppointments(true);
      setErrorMessage('');

      let url = '/admin/appointments?';
      if (statusFilter !== 'all') {
        url += `status=${statusFilter}&`;
      }
      if (searchQuery.trim()) {
        url += `search=${encodeURIComponent(searchQuery.trim())}&`;
      }

      const res = await api.get(url);
      if (res.data?.success) {
        setAppointments(res.data.appointments || []);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load appointments from server');
    } finally {
      setLoadingAppointments(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchStats();
  }, []);

  // Reload appointments when filter or search changes
  useEffect(() => {
    fetchAppointments();
  }, [statusFilter]);

  // Handle Search Submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAppointments();
  };

  // Appointment Action Handlers
  const handleApprove = async (id, refCode) => {
    try {
      setUpdatingId(id);
      setErrorMessage('');
      const res = await api.patch(`/admin/appointments/${id}/approve`);
      if (res.data?.success) {
        setActionMessage(`Appointment ${refCode} approved successfully!`);
        fetchStats();
        fetchAppointments();
        setTimeout(() => setActionMessage(''), 4000);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to approve appointment');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleReject = async (id, refCode) => {
    const reason = window.prompt(
      `Enter reason for rejecting appointment ${refCode} (optional):`,
      'Rejected by Administrator'
    );
    if (reason === null) return; // User cancelled prompt

    try {
      setUpdatingId(id);
      setErrorMessage('');
      const res = await api.patch(`/admin/appointments/${id}/reject`, { reason });
      if (res.data?.success) {
        setActionMessage(`Appointment ${refCode} rejected / cancelled.`);
        fetchStats();
        fetchAppointments();
        setTimeout(() => setActionMessage(''), 4000);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to reject appointment');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleComplete = async (id, refCode) => {
    if (!window.confirm(`Mark appointment ${refCode} as COMPLETED?`)) {
      return;
    }

    try {
      setUpdatingId(id);
      setErrorMessage('');
      const res = await api.patch(`/admin/appointments/${id}/complete`);
      if (res.data?.success) {
        setActionMessage(`Appointment ${refCode} marked as completed.`);
        fetchStats();
        fetchAppointments();
        setTimeout(() => setActionMessage(''), 4000);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to complete appointment');
    } finally {
      setUpdatingId(null);
    }
  };

  const refreshAll = () => {
    fetchStats();
    fetchAppointments();
  };

  return (
    <div className="min-h-screen bg-[#F3FAF5] flex">
      {/* Sidebar */}
      <DashboardSidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardNavbar title="Admin Governance Dashboard" toggleSidebar={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Header Banner */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#16834A] bg-[#EAF6EE] px-2.5 py-1 rounded-full">
                  Admin Perimeter
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Role: {user?.role || 'admin'}
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-[#17231C]">
                Platform Governance & Appointment Management
              </h2>
              <p className="text-xs sm:text-sm text-[#66736B]">
                Real-time MongoDB Atlas telemetry, appointment approval lifecycle, and platform oversight.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshAll}
                leftIcon={<RefreshCw className={`w-4 h-4 ${loadingStats || loadingAppointments ? 'animate-spin text-[#16834A]' : ''}`} />}
              >
                Refresh Data
              </Button>
            </div>
          </div>

          {/* Action Success Alert */}
          {actionMessage && (
            <div className="p-4 rounded-2xl bg-[#EAF6EE] border border-[#16834A]/30 text-[#11643A] text-xs flex items-center space-x-2 font-semibold shadow-soft-sm">
              <CheckCircle2 className="w-5 h-5 text-[#16834A] shrink-0" />
              <span>{actionMessage}</span>
            </div>
          )}

          {/* Error Alert */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 5 Real-Time KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Card 1: Total Appointments */}
            <div className="bg-white rounded-3xl p-5 border border-[#E3EAE5] shadow-card space-y-2">
              <div className="flex items-center justify-between text-[#66736B]">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Bookings</span>
                <CalendarCheck2 className="w-4 h-4 text-[#16834A]" />
              </div>
              <h3 className="text-2xl font-extrabold text-[#17231C]">
                {loadingStats ? <Loader2 className="w-5 h-5 animate-spin text-[#16834A]" /> : stats.totalAppointments}
              </h3>
              <p className="text-[11px] text-[#66736B]">All registered bookings</p>
            </div>

            {/* Card 2: Pending Appointments */}
            <div className="bg-white rounded-3xl p-5 border border-[#E3EAE5] shadow-card space-y-2">
              <div className="flex items-center justify-between text-[#66736B]">
                <span className="text-xs font-semibold uppercase tracking-wider">Pending</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <h3 className="text-2xl font-extrabold text-amber-600">
                {loadingStats ? <Loader2 className="w-5 h-5 animate-spin text-amber-500" /> : stats.pendingAppointments}
              </h3>
              <p className="text-[11px] text-[#66736B]">Awaiting admin action</p>
            </div>

            {/* Card 3: Approved Appointments */}
            <div className="bg-white rounded-3xl p-5 border border-[#E3EAE5] shadow-card space-y-2">
              <div className="flex items-center justify-between text-[#66736B]">
                <span className="text-xs font-semibold uppercase tracking-wider">Approved</span>
                <CheckCircle2 className="w-4 h-4 text-[#16834A]" />
              </div>
              <h3 className="text-2xl font-extrabold text-[#11643A]">
                {loadingStats ? <Loader2 className="w-5 h-5 animate-spin text-[#16834A]" /> : stats.approvedAppointments}
              </h3>
              <p className="text-[11px] text-[#16834A] font-medium">Confirmed slots</p>
            </div>

            {/* Card 4: Completed Appointments */}
            <div className="bg-white rounded-3xl p-5 border border-[#E3EAE5] shadow-card space-y-2">
              <div className="flex items-center justify-between text-[#66736B]">
                <span className="text-xs font-semibold uppercase tracking-wider">Completed</span>
                <UserCheck className="w-4 h-4 text-slate-500" />
              </div>
              <h3 className="text-2xl font-extrabold text-slate-700">
                {loadingStats ? <Loader2 className="w-5 h-5 animate-spin text-slate-500" /> : stats.completedAppointments}
              </h3>
              <p className="text-[11px] text-[#66736B]">Finished consultations</p>
            </div>

            {/* Card 5: Cancelled Appointments */}
            <div className="bg-white rounded-3xl p-5 border border-[#E3EAE5] shadow-card space-y-2">
              <div className="flex items-center justify-between text-[#66736B]">
                <span className="text-xs font-semibold uppercase tracking-wider">Cancelled</span>
                <XCircle className="w-4 h-4 text-rose-500" />
              </div>
              <h3 className="text-2xl font-extrabold text-rose-600">
                {loadingStats ? <Loader2 className="w-5 h-5 animate-spin text-rose-500" /> : stats.cancelledAppointments}
              </h3>
              <p className="text-[11px] text-[#66736B]">Rejected or revoked</p>
            </div>
          </div>

          {/* Real-Time Queue & Token Management Terminal */}
          <LiveQueueTerminal onQueueActivity={refreshAll} />

          {/* Appointment Control & Management Section */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E3EAE5]">
              <div>
                <h3 className="text-lg font-bold text-[#17231C]">
                  All Platform Appointments
                </h3>
                <p className="text-xs text-[#66736B]">
                  Manage approval, rejection, and completion status directly in MongoDB.
                </p>
              </div>

              {/* Search Bar */}
              <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2 max-w-sm w-full">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#66736B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by token, ref, or patient..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E3EAE5] bg-[#F3FAF5] focus:outline-none focus:ring-2 focus:ring-[#16834A]/25 focus:border-[#16834A]"
                  />
                </div>
                <Button type="submit" variant="primary" size="sm">
                  Search
                </Button>
              </form>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-[#16834A] text-white shadow-soft-sm'
                    : 'bg-[#F3FAF5] text-[#66736B] hover:text-[#17231C] border border-[#E3EAE5]'
                }`}
              >
                All ({stats.totalAppointments})
              </button>

              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all ${
                  statusFilter === 'pending'
                    ? 'bg-amber-500 text-white shadow-soft-sm'
                    : 'bg-[#F3FAF5] text-[#66736B] hover:text-[#17231C] border border-[#E3EAE5]'
                }`}
              >
                Pending ({stats.pendingAppointments})
              </button>

              <button
                onClick={() => setStatusFilter('approved')}
                className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all ${
                  statusFilter === 'approved'
                    ? 'bg-[#16834A] text-white shadow-soft-sm'
                    : 'bg-[#F3FAF5] text-[#66736B] hover:text-[#17231C] border border-[#E3EAE5]'
                }`}
              >
                Approved ({stats.approvedAppointments})
              </button>

              <button
                onClick={() => setStatusFilter('completed')}
                className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all ${
                  statusFilter === 'completed'
                    ? 'bg-slate-700 text-white shadow-soft-sm'
                    : 'bg-[#F3FAF5] text-[#66736B] hover:text-[#17231C] border border-[#E3EAE5]'
                }`}
              >
                Completed ({stats.completedAppointments})
              </button>

              <button
                onClick={() => setStatusFilter('cancelled')}
                className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all ${
                  statusFilter === 'cancelled'
                    ? 'bg-rose-600 text-white shadow-soft-sm'
                    : 'bg-[#F3FAF5] text-[#66736B] hover:text-[#17231C] border border-[#E3EAE5]'
                }`}
              >
                Cancelled ({stats.cancelledAppointments})
              </button>
            </div>

            {/* Appointment Table */}
            {loadingAppointments ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#16834A] mx-auto" />
                <p className="text-xs text-[#66736B]">Querying appointments from MongoDB Atlas...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-[#F3FAF5] rounded-2xl border border-dashed border-[#E3EAE5]">
                <CalendarCheck2 className="w-8 h-8 text-[#66736B] mx-auto" />
                <h4 className="font-bold text-sm text-[#17231C]">No appointments found</h4>
                <p className="text-xs text-[#66736B] max-w-sm mx-auto">
                  No appointments match the selected status filter or search parameters.
                </p>
                {statusFilter !== 'all' && (
                  <Button variant="outline" size="sm" onClick={() => setStatusFilter('all')}>
                    View All Appointments
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[#E3EAE5]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F3FAF5] text-[#66736B] border-b border-[#E3EAE5]">
                      <th className="py-3 px-4 font-semibold uppercase tracking-wider">Queue Token & Ref</th>
                      <th className="py-3 px-4 font-semibold uppercase tracking-wider">Customer / Patient</th>
                      <th className="py-3 px-4 font-semibold uppercase tracking-wider">Service & Clinic</th>
                      <th className="py-3 px-4 font-semibold uppercase tracking-wider">Date & Time</th>
                      <th className="py-3 px-4 font-semibold uppercase tracking-wider">Current Status</th>
                      <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3EAE5] bg-white">
                    {appointments.map((apt) => {
                      const isPending = apt.status === 'pending';
                      const isConfirmed = apt.status === 'confirmed' || apt.status === 'approved';
                      const isCompleted = apt.status === 'completed';
                      const isCancelled = apt.status === 'cancelled';
                      const isActionLoading = updatingId === apt._id;

                      return (
                        <tr key={apt._id} className="hover:bg-[#F3FAF5]/60 transition-colors">
                          {/* Token & Reference */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <span className="inline-flex items-center space-x-1 font-mono font-bold text-white bg-[#16834A] px-2 py-0.5 rounded text-[11px]">
                                <Ticket className="w-3 h-3" />
                                <span>{apt.tokenNumber || 'QL---'}</span>
                              </span>
                              <p className="font-mono text-[10px] text-[#66736B]">
                                {apt.bookingReference}
                              </p>
                            </div>
                          </td>

                          {/* Customer Details */}
                          <td className="py-3.5 px-4">
                            <div>
                              <p className="font-bold text-[#17231C]">
                                {apt.customerId?.name || 'Walk-In Customer'}
                              </p>
                              <p className="text-[11px] text-[#66736B]">
                                {apt.customerId?.email || 'N/A'}
                              </p>
                              {apt.customerId?.phone && (
                                <p className="text-[10px] text-[#66736B]">
                                  {apt.customerId.phone}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Service & Provider */}
                          <td className="py-3.5 px-4">
                            <div>
                              <p className="font-semibold text-[#17231C]">
                                {apt.serviceId?.name || 'Consultation'}
                              </p>
                              <p className="text-[11px] text-[#66736B]">
                                {apt.businessId?.name || 'Clinic'}
                              </p>
                            </div>
                          </td>

                          {/* Date & Time */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div>
                              <p className="font-semibold text-[#16834A]">
                                {apt.appointmentDate}
                              </p>
                              <p className="text-[11px] text-[#66736B]">
                                {apt.startTime} - {apt.endTime}
                              </p>
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block font-semibold px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${
                                isConfirmed
                                  ? 'bg-[#EAF6EE] text-[#11643A] border border-[#16834A]/20'
                                  : isPending
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : isCompleted
                                  ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {apt.status}
                            </span>
                            {apt.cancellationReason && (
                              <p className="text-[10px] text-rose-600 truncate max-w-[140px] mt-0.5" title={apt.cancellationReason}>
                                {apt.cancellationReason}
                              </p>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-right">
                            {isActionLoading ? (
                              <span className="text-xs text-[#16834A] font-semibold flex items-center justify-end space-x-1">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Updating...</span>
                              </span>
                            ) : (
                              <div className="flex items-center justify-end space-x-1.5">
                                {/* If Pending: Show Approve & Reject */}
                                {isPending && (
                                  <>
                                    <button
                                      onClick={() => handleApprove(apt._id, apt.bookingReference)}
                                      title="Approve Appointment"
                                      className="p-1.5 rounded-lg bg-[#EAF6EE] text-[#11643A] hover:bg-[#16834A] hover:text-white transition-colors"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleReject(apt._id, apt.bookingReference)}
                                      title="Reject / Cancel"
                                      className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </>
                                )}

                                {/* If Confirmed/Approved: Show Complete & Cancel */}
                                {isConfirmed && (
                                  <>
                                    <button
                                      onClick={() => handleComplete(apt._id, apt.bookingReference)}
                                      title="Mark Completed"
                                      className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-800 hover:text-white text-[11px] font-semibold transition-colors flex items-center space-x-1"
                                    >
                                      <UserCheck className="w-3.5 h-3.5" />
                                      <span>Complete</span>
                                    </button>
                                    <button
                                      onClick={() => handleReject(apt._id, apt.bookingReference)}
                                      title="Cancel Appointment"
                                      className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </>
                                )}

                                {/* If Cancelled: Allow Reinstating / Approving */}
                                {isCancelled && (
                                  <button
                                    onClick={() => handleApprove(apt._id, apt.bookingReference)}
                                    title="Re-approve Appointment"
                                    className="px-2 py-1 rounded-lg bg-[#EAF6EE] text-[#11643A] hover:bg-[#16834A] hover:text-white text-[11px] font-semibold transition-colors flex items-center space-x-1"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Re-approve</span>
                                  </button>
                                )}

                                {/* If Completed: Show Done badge */}
                                {isCompleted && (
                                  <span className="text-[11px] text-slate-400 italic">
                                    Finalized
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
