import React, { useState, useEffect } from 'react';
import {
  History,
  Calendar,
  Clock,
  Building2,
  CheckCircle2,
  XCircle,
  UserCheck,
  Ticket,
  Loader2,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardSidebar from '../../components/layout/DashboardSidebar';
import DashboardNavbar from '../../components/layout/DashboardNavbar';
import Button from '../../components/ui/Button';
import api from '../../services/api';

export default function HistoryPage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'completed' | 'cancelled'

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Date not specified';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      const [h, m] = timeStr.split(':');
      const hour = parseInt(h, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${m} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  const fetchHistory = async (isManual = false) => {
    if (isManual) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      // Fetch all customer appointments from MongoDB (scoped to authenticated JWT user)
      const res = await api.get('/appointments/my');
      if (res.data?.success) {
        const allList = res.data.appointments || [];
        // Concluded/historical appointments are those marked 'completed' or 'cancelled' (or 'no_show')
        const pastList = allList.filter((apt) =>
          ['completed', 'cancelled', 'no_show'].includes(apt.status)
        );
        setAppointments(pastList);
      } else {
        setAppointments([]);
      }
    } catch (err) {
      const errMsg =
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to load appointment history from server.';
      setError(errMsg);
      setAppointments([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Filtered list based on active tab
  const filteredAppointments = appointments.filter((apt) => {
    if (activeFilter === 'completed') return apt.status === 'completed';
    if (activeFilter === 'cancelled') return apt.status === 'cancelled';
    return true; // 'all'
  });

  const completedCount = appointments.filter((a) => a.status === 'completed').length;
  const cancelledCount = appointments.filter((a) => a.status === 'cancelled').length;

  return (
    <div className="min-h-screen bg-[#F3FAF5] flex">
      <DashboardSidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardNavbar title="History & Past Visits" toggleSidebar={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Header Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#16834A] bg-[#EAF6EE] px-2.5 py-1 rounded-full">
                Verified Records
              </span>
              <h2 className="text-2xl font-extrabold text-[#17231C]">
                Past Service History & Records
              </h2>
              <p className="text-xs sm:text-sm text-[#66736B]">
                Review your completed clinic visits, consultations, and service logs synchronized from MongoDB Atlas.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => fetchHistory(true)}
                disabled={loading || isRefreshing}
                title="Refresh history"
                className="p-2.5 rounded-xl border border-[#E3EAE5] bg-white text-[#66736B] hover:text-[#16834A] hover:bg-[#EAF6EE] transition-colors disabled:opacity-50 flex items-center space-x-1.5 text-xs font-semibold"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#16834A]' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          {!loading && appointments.length > 0 && (
            <div className="flex items-center space-x-2 border-b border-[#E3EAE5] pb-3">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  activeFilter === 'all'
                    ? 'bg-[#16834A] text-white shadow-soft-sm'
                    : 'bg-white text-[#66736B] border border-[#E3EAE5] hover:bg-slate-50'
                }`}
              >
                <span>All History</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#66736B]'
                  }`}
                >
                  {appointments.length}
                </span>
              </button>

              <button
                onClick={() => setActiveFilter('completed')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  activeFilter === 'completed'
                    ? 'bg-[#16834A] text-white shadow-soft-sm'
                    : 'bg-white text-[#66736B] border border-[#E3EAE5] hover:bg-slate-50'
                }`}
              >
                <span>Completed</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeFilter === 'completed' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {completedCount}
                </span>
              </button>

              <button
                onClick={() => setActiveFilter('cancelled')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  activeFilter === 'cancelled'
                    ? 'bg-rose-600 text-white shadow-soft-sm'
                    : 'bg-white text-[#66736B] border border-[#E3EAE5] hover:bg-slate-50'
                }`}
              >
                <span>Cancelled</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeFilter === 'cancelled' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {cancelledCount}
                </span>
              </button>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="bg-white rounded-3xl p-6 border border-rose-200 shadow-card text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-[#17231C]">Unable to Load Visit Records</h4>
              <p className="text-xs text-[#66736B]">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchHistory(true)}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Visits List */}
          {loading ? (
            <div className="bg-white rounded-3xl p-12 border border-[#E3EAE5] shadow-card text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#16834A] mx-auto" />
              <p className="text-sm font-semibold text-[#17231C]">Loading verified visit records...</p>
              <p className="text-xs text-[#66736B]">Synchronizing historical appointments from MongoDB</p>
            </div>
          ) : !error && appointments.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-[#E3EAE5] text-center space-y-3 shadow-card">
              <div className="w-14 h-14 rounded-2xl bg-[#EAF6EE] text-[#16834A] flex items-center justify-center mx-auto border border-[#16834A]/20 shadow-inner">
                <History className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-base text-[#17231C]">No Past Visits Recorded</h3>
              <p className="text-xs text-[#66736B] max-w-sm mx-auto leading-relaxed">
                You don't have any completed or past appointments in your record yet. Once an appointment concludes or is cancelled, its verified details will appear here.
              </p>
              <Link to="/customer/explore">
                <Button variant="primary" size="sm" className="mt-2" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Explore Services & Providers
                </Button>
              </Link>
            </div>
          ) : !error && filteredAppointments.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-[#E3EAE5] text-center space-y-2 shadow-card">
              <p className="text-sm font-semibold text-[#17231C]">
                No {activeFilter} appointments found.
              </p>
              <p className="text-xs text-[#66736B]">
                Switch to another filter above to view your other past records.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((apt) => {
                const isCompleted = apt.status === 'completed';
                const isCancelled = apt.status === 'cancelled';

                return (
                  <div
                    key={apt._id}
                    className="bg-white rounded-3xl p-6 border border-[#E3EAE5] shadow-card space-y-4 hover:shadow-soft transition-all"
                  >
                    {/* Header Row: Token + Service + Status Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E3EAE5] pb-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2.5">
                          <span
                            className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg border shadow-xs ${
                              isCompleted
                                ? 'bg-[#16834A] text-white border-[#11643A]'
                                : isCancelled
                                ? 'bg-slate-100 text-slate-700 border-slate-300'
                                : 'bg-[#EAF6EE] text-[#11643A] border-[#16834A]/20'
                            }`}
                          >
                            {apt.tokenNumber || 'QL---'}
                          </span>
                          <h3 className="font-bold text-base text-[#17231C]">
                            {apt.serviceId?.name || 'General Consultation'}
                          </h3>
                        </div>

                        <p className="text-xs text-[#66736B] flex items-center space-x-2">
                          <Building2 className="w-3.5 h-3.5 text-[#16834A] shrink-0" />
                          <span className="font-semibold text-[#17231C]">
                            {apt.businessId?.name || 'Provider Clinic'}
                          </span>
                          <span>•</span>
                          <span className="font-mono text-[11px] text-[#66736B]">
                            Ref: {apt.bookingReference}
                          </span>
                        </p>
                      </div>

                      {/* Status Pill */}
                      <div>
                        {isCompleted ? (
                          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EAF6EE] text-[#11643A] border border-[#16834A]/20">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#16834A]" />
                            <span>Service Completed</span>
                          </span>
                        ) : isCancelled ? (
                          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Appointment Cancelled</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                            <span>{apt.status}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: Date, Time & Staff Member */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-2xl bg-[#F3FAF5] border border-[#E3EAE5] space-y-0.5">
                        <span className="text-[#66736B] flex items-center space-x-1 text-[11px]">
                          <Calendar className="w-3 h-3 text-[#16834A]" />
                          <span>Appointment Date</span>
                        </span>
                        <p className="font-bold text-[#17231C]">
                          {formatDate(apt.appointmentDate)}
                        </p>
                      </div>

                      <div className="p-3 rounded-2xl bg-[#F3FAF5] border border-[#E3EAE5] space-y-0.5">
                        <span className="text-[#66736B] flex items-center space-x-1 text-[11px]">
                          <Clock className="w-3 h-3 text-[#16834A]" />
                          <span>Scheduled Time Slot</span>
                        </span>
                        <p className="font-bold text-[#11643A]">
                          {formatTime(apt.startTime)} – {formatTime(apt.endTime)}
                        </p>
                      </div>

                      <div className="p-3 rounded-2xl bg-[#F3FAF5] border border-[#E3EAE5] space-y-0.5">
                        <span className="text-[#66736B] flex items-center space-x-1 text-[11px]">
                          <UserCheck className="w-3 h-3 text-[#16834A]" />
                          <span>Attending Practitioner / Staff</span>
                        </span>
                        <p className="font-bold text-[#17231C]">
                          {apt.staffId?.name
                            ? `${apt.staffId.name} (${apt.staffId.title || 'Staff'})`
                            : apt.staffId?.title || 'Assigned Counter Staff'}
                        </p>
                      </div>
                    </div>

                    {/* Customer Notes */}
                    {apt.notes && (
                      <div className="text-xs bg-[#F3FAF5] p-3 rounded-xl border border-[#E3EAE5] space-y-1">
                        <span className="font-semibold text-[#17231C] flex items-center space-x-1">
                          <FileText className="w-3.5 h-3.5 text-[#16834A]" />
                          <span>Booking Notes:</span>
                        </span>
                        <p className="text-[#66736B] pl-4">{apt.notes}</p>
                      </div>
                    )}

                    {/* Cancellation Details (if cancelled) */}
                    {isCancelled && (
                      <div className="text-xs bg-rose-50/60 p-3 rounded-xl border border-rose-200 text-rose-800 space-y-0.5">
                        <p className="font-semibold flex items-center space-x-1">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Cancellation Details</span>
                        </p>
                        <p className="text-rose-700 pl-4.5">
                          <strong>Reason:</strong>{' '}
                          {apt.cancellationReason || 'Cancelled at customer request'}
                        </p>
                        {apt.cancelledAt && (
                          <p className="text-[11px] text-rose-600/80 pl-4.5">
                            Recorded on {new Date(apt.cancelledAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Bottom Status Summary Footer */}
                    <div className="flex items-center justify-between text-xs text-[#66736B] pt-1">
                      <span>
                        Service Duration: ~{apt.serviceId?.durationMinutes || 30} mins
                        {apt.serviceId?.price ? ` • Price: $${apt.serviceId.price}` : ''}
                      </span>
                      <span className="text-[#16834A] font-semibold flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>MongoDB Atlas Verified</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
