import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Ticket,
  PlusCircle,
  Building2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Loader2,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import DashboardSidebar from '../../components/layout/DashboardSidebar';
import DashboardNavbar from '../../components/layout/DashboardNavbar';
import Button from '../../components/ui/Button';
import BookAppointmentModal from '../../components/booking/BookAppointmentModal';
import api from '../../services/api';

export default function MyAppointments() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionNotice, setActionNotice] = useState('');

  // Booking modal state
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [demoBusiness, setDemoBusiness] = useState(null);

  // Fetch appointments from backend API
  const fetchAppointments = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/appointments/my');
      if (response.data.success) {
        setAppointments(response.data.appointments || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load appointments from server');
    } finally {
      setLoading(false);
    }
  };

  // Fetch primary business for the booking modal
  useEffect(() => {
    api
      .get('/businesses')
      .then((res) => {
        if (res.data.businesses?.length > 0) {
          const preferred =
            res.data.businesses.find((b) => b.serviceCount > 0) ||
            res.data.businesses.find((b) => b.name === 'Metro Health Clinic') ||
            res.data.businesses[0];
          setDemoBusiness(preferred);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Handle appointment cancellation
  const handleCancelAppointment = async (id, refCode) => {
    if (!window.confirm(`Are you sure you want to cancel appointment ${refCode}?`)) {
      return;
    }

    try {
      const response = await api.patch(`/appointments/${id}/cancel`, {
        cancellationReason: 'Cancelled by customer from portal',
      });

      if (response.data.success) {
        setActionNotice(`Appointment ${refCode} has been cancelled successfully.`);
        fetchAppointments(); // Refresh list to reflect cancelled status
        setTimeout(() => setActionNotice(''), 4000);
      }
    } catch (err) {
      alert(err.message || 'Failed to cancel appointment');
    }
  };

  const filteredAppointments = appointments.filter((apt) => {
    if (activeTab === 'upcoming') {
      return ['confirmed', 'pending', 'in_progress'].includes(apt.status);
    }
    if (activeTab === 'completed') return apt.status === 'completed';
    if (activeTab === 'cancelled') return apt.status === 'cancelled';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F3FAF5] flex">
      <DashboardSidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardNavbar title="My Appointments" toggleSidebar={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Header Banner */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#16834A] bg-[#EAF6EE] px-2.5 py-1 rounded-full">
                Appointments Portal
              </span>
              <h2 className="text-2xl font-extrabold text-[#17231C]">
                {user?.name ? `${user.name}'s Appointments` : 'My Appointments'}
              </h2>
              <p className="text-xs sm:text-sm text-[#66736B]">
                Your confirmed bookings, scheduled slots, and cancellation options.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAppointments}
                leftIcon={<RefreshCw className="w-4 h-4 text-[#16834A]" />}
              >
                Refresh
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setBookingModalOpen(true)}
                leftIcon={<PlusCircle className="w-4 h-4" />}
              >
                Book Appointment
              </Button>
            </div>
          </div>

          {/* Success / Action Notice Banner */}
          {actionNotice && (
            <div className="p-4 rounded-2xl bg-[#EAF6EE] border border-[#16834A]/20 text-[#11643A] text-xs flex items-center space-x-2 font-semibold">
              <CheckCircle2 className="w-5 h-5 text-[#16834A]" />
              <span>{actionNotice}</span>
            </div>
          )}

          {/* Error Notice */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex items-center space-x-2 border-b border-[#E3EAE5] pb-3 text-xs sm:text-sm">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                activeTab === 'upcoming'
                  ? 'bg-white text-[#11643A] shadow-soft border border-[#E3EAE5]'
                  : 'text-[#66736B] hover:text-[#17231C]'
              }`}
            >
              Upcoming ({appointments.filter((a) => ['confirmed', 'pending', 'in_progress'].includes(a.status)).length})
            </button>

            <button
              onClick={() => setActiveTab('completed')}
              className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                activeTab === 'completed'
                  ? 'bg-white text-[#11643A] shadow-soft border border-[#E3EAE5]'
                  : 'text-[#66736B] hover:text-[#17231C]'
              }`}
            >
              Completed ({appointments.filter((a) => a.status === 'completed').length})
            </button>

            <button
              onClick={() => setActiveTab('cancelled')}
              className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                activeTab === 'cancelled'
                  ? 'bg-white text-[#11643A] shadow-soft border border-[#E3EAE5]'
                  : 'text-[#66736B] hover:text-[#17231C]'
              }`}
            >
              Cancelled ({appointments.filter((a) => a.status === 'cancelled').length})
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-[#11643A] shadow-soft border border-[#E3EAE5]'
                  : 'text-[#66736B] hover:text-[#17231C]'
              }`}
            >
              All Records ({appointments.length})
            </button>
          </div>

          {/* Appointments List State */}
          {loading ? (
            <div className="bg-white rounded-3xl p-12 border border-[#E3EAE5] shadow-card text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#16834A] mx-auto" />
              <p className="text-xs text-[#66736B]">Loading your appointments from MongoDB Atlas...</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-[#E3EAE5] text-center space-y-4 shadow-card">
              <div className="w-12 h-12 rounded-2xl bg-[#F3FAF5] text-[#66736B] flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-[#17231C]">No appointments in this category</h3>
              <p className="text-xs text-[#66736B] max-w-sm mx-auto">
                You don't have any appointments matching this filter. Schedule a new consultation with our verified clinic.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="mt-2"
                onClick={() => setBookingModalOpen(true)}
              >
                Schedule an Appointment
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((apt) => (
                <div
                  key={apt._id}
                  className="bg-white rounded-3xl p-6 border border-[#E3EAE5] shadow-card hover:shadow-soft transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  {/* Left Details */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Prominent Queue Token Badge */}
                      <span className="inline-flex items-center space-x-1.5 font-mono text-xs font-extrabold text-white bg-[#16834A] px-3 py-1 rounded-xl shadow-sm">
                        <Ticket className="w-3.5 h-3.5" />
                        <span>Token: {apt.tokenNumber || 'QL---'}</span>
                      </span>

                      <span className="font-mono text-xs font-semibold text-[#11643A] bg-[#EAF6EE] px-2.5 py-1 rounded-lg border border-[#16834A]/20">
                        Ref: {apt.bookingReference}
                      </span>

                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          apt.status === 'confirmed'
                            ? 'bg-[#EAF6EE] text-[#11643A] border border-[#16834A]/20'
                            : apt.status === 'completed'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {apt.status}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-[#17231C]">
                        {apt.serviceId?.name || 'Medical Consultation'}
                      </h3>
                      <p className="text-xs text-[#66736B] flex items-center space-x-2 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-[#16834A]" />
                        <span className="font-medium text-[#17231C]">
                          {apt.businessId?.name || 'Clinic'}
                        </span>
                        <span>•</span>
                        <span>
                          {apt.businessId?.address?.city || 'Healthcare Center'}
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#16834A] font-semibold">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>{apt.appointmentDate}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-4 h-4" />
                        <span>
                          {apt.startTime} - {apt.endTime}
                        </span>
                      </div>
                      {apt.serviceId?.price > 0 && (
                        <span className="text-[#17231C] font-bold">
                          ${apt.serviceId.price}
                        </span>
                      )}
                    </div>

                    {apt.notes && (
                      <p className="text-xs text-[#66736B] italic bg-[#F3FAF5] p-2.5 rounded-xl border border-[#E3EAE5]">
                        Note: {apt.notes}
                      </p>
                    )}
                  </div>

                  {/* Right Actions */}
                  <div className="flex flex-wrap md:flex-col items-stretch justify-end gap-2 shrink-0">
                    {['confirmed', 'pending'].includes(apt.status) && (
                      <>
                        <Link to="/customer/queue">
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full"
                            leftIcon={<Ticket className="w-4 h-4" />}
                          >
                            Live Queue Pass
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 border border-rose-200"
                          onClick={() => handleCancelAppointment(apt._id, apt.bookingReference)}
                          leftIcon={<XCircle className="w-4 h-4 text-rose-500" />}
                        >
                          Cancel Booking
                        </Button>
                      </>
                    )}

                    {apt.status === 'cancelled' && (
                      <span className="text-xs text-rose-600 italic">
                        Cancelled: {apt.cancellationReason || 'No reason specified'}
                      </span>
                    )}

                    {apt.status === 'completed' && (
                      <Link to="/customer/history">
                        <Button variant="outline" size="sm">
                          Leave Review
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Booking Modal */}
      {demoBusiness && (
        <BookAppointmentModal
          isOpen={bookingModalOpen}
          onClose={() => setBookingModalOpen(false)}
          business={demoBusiness}
          onBookingSuccess={() => {
            fetchAppointments();
          }}
        />
      )}
    </div>
  );
}
