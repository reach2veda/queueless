import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Ticket,
  ChevronRight,
  PlusCircle,
  Building2,
  CheckCircle2,
  AlertCircle,
  Bell,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DashboardSidebar from '../components/layout/DashboardSidebar';
import DashboardNavbar from '../components/layout/DashboardNavbar';
import QueueTicket from '../components/ui/QueueTicket';
import Button from '../components/ui/Button';
import BookAppointmentModal from '../components/booking/BookAppointmentModal';
import api from '../services/api';
import { getSocket } from '../services/socket';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);

  // Active Queue Ticket state
  const [activeTicket, setActiveTicket] = useState(null);
  const [currentlyServing, setCurrentlyServing] = useState('None');
  const [totalWaiting, setTotalWaiting] = useState(0);
  const [loadingTicket, setLoadingTicket] = useState(true);
  const [ticketError, setTicketError] = useState('');
  const [isRefreshingTicket, setIsRefreshingTicket] = useState(false);

  // Booking modal
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [demoBusiness, setDemoBusiness] = useState(null);

  const fetchUpcoming = () => {
    setLoadingAppointments(true);
    api
      .get('/appointments/my')
      .then((res) => {
        const list = res.data.appointments || [];
        setUpcomingAppointments(
          list.filter((a) => ['confirmed', 'pending', 'in_progress'].includes(a.status))
        );
      })
      .catch(() => {
        setUpcomingAppointments([]);
      })
      .finally(() => setLoadingAppointments(false));
  };

  const fetchTicket = async (isManual = false) => {
    if (isManual) {
      setIsRefreshingTicket(true);
    } else {
      setLoadingTicket(true);
    }
    setTicketError('');

    try {
      const res = await api.get('/queues/my/ticket');
      if (res.data?.success && res.data?.hasActiveTicket && res.data?.ticket) {
        setActiveTicket(res.data.ticket);
        setCurrentlyServing(res.data.currentlyServingToken || 'None');
        setTotalWaiting(res.data.totalWaiting ?? 0);
      } else {
        setActiveTicket(null);
        setCurrentlyServing(res.data?.currentlyServingToken || 'None');
        setTotalWaiting(res.data?.totalWaiting ?? 0);
      }
    } catch (err) {
      console.error('Failed to load active queue ticket:', err);
      setTicketError(err.response?.data?.message || err.message || 'Failed to load active queue ticket');
      setActiveTicket(null);
    } finally {
      setLoadingTicket(false);
      setIsRefreshingTicket(false);
    }
  };

  useEffect(() => {
    fetchUpcoming();
    fetchTicket();

    api
      .get('/businesses')
      .then((res) => {
        if (res.data.businesses?.length > 0) {
          setDemoBusiness(res.data.businesses[0]);
        }
      })
      .catch(() => {});

    // Reuse existing Socket.IO singleton for live updates
    let socket = null;
    try {
      socket = getSocket();
      const handleQueueUpdate = () => {
        fetchTicket();
        fetchUpcoming();
      };

      socket.on('queue:updated', handleQueueUpdate);
      socket.on('user:ticket-updated', handleQueueUpdate);
      socket.on('queue:update', handleQueueUpdate);
      socket.on('ticket:update', handleQueueUpdate);
    } catch (err) {
      console.warn('Socket connection error in CustomerDashboard:', err);
    }

    return () => {
      if (socket) {
        socket.off('queue:updated');
        socket.off('user:ticket-updated');
        socket.off('queue:update');
        socket.off('ticket:update');
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F3FAF5] flex">
      {/* Sidebar */}
      <DashboardSidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardNavbar title="Customer Portal" toggleSidebar={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Welcome Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#16834A] bg-[#EAF6EE] px-2.5 py-1 rounded-full">
                Customer Overview
              </span>
              <h2 className="text-2xl font-extrabold text-[#17231C]">
                Hello, {user?.name || 'Customer'}! 👋
              </h2>
              <p className="text-xs sm:text-sm text-[#66736B]">
                Track your real-time queue position and upcoming service appointments.
              </p>
            </div>

            <div className="flex items-center space-x-3">
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

          {/* Grid Layout: Active Queue Ticket vs Upcoming Appointments */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT: Live Virtual Queue Card (Col 5) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#17231C] text-base flex items-center space-x-2">
                  <Ticket className="w-5 h-5 text-[#16834A]" />
                  <span>Active Queue Ticket</span>
                </h3>
                <div className="flex items-center space-x-2">
                  {activeTicket && (
                    <span className="text-xs text-[#16834A] font-semibold flex items-center space-x-1 bg-[#EAF6EE] px-2.5 py-1 rounded-full border border-[#16834A]/20">
                      <span className="w-2 h-2 rounded-full bg-[#16834A] animate-ping"></span>
                      <span>Live Tracking</span>
                    </span>
                  )}
                  <button
                    onClick={() => fetchTicket(true)}
                    disabled={loadingTicket || isRefreshingTicket}
                    title="Refresh queue ticket"
                    className="p-1.5 rounded-lg text-[#66736B] hover:text-[#16834A] hover:bg-[#EAF6EE] transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshingTicket ? 'animate-spin text-[#16834A]' : ''}`} />
                  </button>
                </div>
              </div>

              {loadingTicket ? (
                <div className="bg-white rounded-3xl p-8 border border-[#E3EAE5] shadow-card text-center space-y-3">
                  <Loader2 className="w-7 h-7 animate-spin text-[#16834A] mx-auto" />
                  <p className="text-sm font-semibold text-[#17231C]">Checking live queue status...</p>
                  <p className="text-xs text-[#66736B]">Retrieving your active queue pass from the server</p>
                </div>
              ) : ticketError ? (
                <div className="bg-white rounded-3xl p-6 border border-red-200 shadow-card text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-[#17231C]">Could Not Load Queue Ticket</h4>
                  <p className="text-xs text-[#66736B]">{ticketError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchTicket(true)}
                    leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                  >
                    Try Again
                  </Button>
                </div>
              ) : activeTicket ? (
                <div className="space-y-4">
                  <QueueTicket
                    ticketNumber={activeTicket.tokenNumber || activeTicket.ticketNumber || 'QL---'}
                    businessName={activeTicket.businessName || 'Metro Health Clinic'}
                    serviceName={activeTicket.serviceName || 'General Consultation'}
                    positionAhead={activeTicket.positionAhead ?? 0}
                    estimatedWait={activeTicket.estimatedWait ?? activeTicket.estimatedWaitMinutes ?? 0}
                    status={(activeTicket.status || 'WAITING').toUpperCase()}
                    date={activeTicket.counterName ? `${activeTicket.counterName} • Live Queue` : 'Live Queue Pass'}
                    className="max-w-none w-full"
                  />

                  {/* Serving info & advice box */}
                  <div className="bg-white rounded-2xl p-4 border border-[#E3EAE5] shadow-card space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E3EAE5]">
                      <span className="text-xs font-semibold text-[#66736B]">Currently Serving Token</span>
                      <span className="text-xs font-mono font-bold text-[#11643A] bg-[#EAF6EE] px-2.5 py-1 rounded-md border border-[#16834A]/20">
                        {currentlyServing && currentlyServing !== 'None' ? currentlyServing : 'Queue Idle / Calling Next'}
                      </span>
                    </div>

                    <div className="flex items-start space-x-2.5 text-xs text-[#66736B]">
                      <Bell className="w-4 h-4 text-[#16834A] shrink-0 mt-0.5" />
                      <div>
                        {activeTicket.status === 'called' || activeTicket.positionAhead === 0 ? (
                          <p className="font-bold text-[#16834A]">
                            🎉 You are next in line! Please proceed to the service counter.
                          </p>
                        ) : activeTicket.status === 'serving' ? (
                          <p className="font-bold text-[#11643A]">
                            ✨ You are currently being served at the counter.
                          </p>
                        ) : (
                          <p>
                            You have <strong className="text-[#17231C]">{activeTicket.positionAhead} {activeTicket.positionAhead === 1 ? 'person' : 'people'}</strong> ahead of you. Estimated wait is ~<strong className="text-[#17231C]">{activeTicket.estimatedWait ?? activeTicket.estimatedWaitMinutes ?? 0} mins</strong>.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-[11px] text-[#66736B]">
                        Total waiting: <strong className="text-[#17231C]">{totalWaiting}</strong>
                      </span>
                      <Link to="/customer/queue">
                        <Button variant="outline" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                          Live Pass & Counter
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#EAF6EE] text-[#16834A] flex items-center justify-center mx-auto border border-[#16834A]/20 shadow-inner">
                    <Ticket className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-base text-[#17231C]">No Active Queue Ticket</h4>
                    <p className="text-xs text-[#66736B] leading-relaxed max-w-sm mx-auto">
                      You don't have an active queue ticket right now. Book an appointment or check in at a provider to get your live virtual pass and track your position in real time.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setBookingModalOpen(true)}
                      leftIcon={<PlusCircle className="w-4 h-4" />}
                    >
                      Book Appointment
                    </Button>
                    <Link to="/customer/explore">
                      <Button variant="outline" size="sm">
                        Explore Providers
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: Upcoming Appointments & History (Col 7) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Upcoming Appointments Card */}
              <div className="bg-white rounded-3xl p-6 border border-[#E3EAE5] shadow-card space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#E3EAE5]">
                  <h3 className="font-bold text-[#17231C] text-base flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-[#16834A]" />
                    <span>Upcoming Appointments</span>
                  </h3>
                  <Link to="/customer/appointments" className="text-xs font-semibold text-[#16834A] hover:underline">
                    View All &rarr;
                  </Link>
                </div>

                {loadingAppointments ? (
                  <div className="py-6 text-center text-xs text-[#66736B]">
                    <Loader2 className="w-5 h-5 animate-spin text-[#16834A] mx-auto mb-1" />
                    <span>Loading appointments...</span>
                  </div>
                ) : upcomingAppointments.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-[#F3FAF5] border border-[#E3EAE5] text-center space-y-2">
                    <p className="text-xs text-[#66736B]">You have no upcoming appointments scheduled.</p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setBookingModalOpen(true)}
                    >
                      Schedule One Now
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingAppointments.map((apt) => (
                      <div
                        key={apt._id}
                        className="p-4 rounded-2xl bg-[#F3FAF5] border border-[#E3EAE5] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-[#11643A] bg-[#EAF6EE] px-2 py-0.5 rounded-md">
                              {apt.status}
                            </span>
                            <span className="text-xs font-mono text-[#66736B]">{apt.bookingReference}</span>
                            <h4 className="text-sm font-bold text-[#17231C]">
                              {apt.serviceId?.name || 'General Consultation'}
                            </h4>
                          </div>
                          <p className="text-xs text-[#66736B]">
                            {apt.businessId?.name || 'Metro Health Clinic'}
                          </p>
                          <p className="text-xs font-medium text-[#16834A] flex items-center space-x-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              {apt.appointmentDate} at {apt.startTime} - {apt.endTime}
                            </span>
                          </p>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Link to="/customer/appointments">
                            <Button variant="outline" size="sm">
                              Manage
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Links Card */}
              <div className="bg-white rounded-3xl p-6 border border-[#E3EAE5] shadow-card space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#E3EAE5]">
                  <h3 className="font-bold text-[#17231C] text-base">Explore & Review</h3>
                  <Link to="/customer/history" className="text-xs font-semibold text-[#16834A] hover:underline">
                    Past Records &rarr;
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <Link
                    to="/customer/explore"
                    className="p-3.5 rounded-2xl bg-[#F3FAF5] border border-[#E3EAE5] hover:border-[#16834A]/40 transition-colors"
                  >
                    <p className="font-bold text-[#17231C]">Discover Providers</p>
                    <p className="text-[#66736B] mt-0.5">Explore clinics & salons</p>
                  </Link>

                  <Link
                    to="/customer/queue"
                    className="p-3.5 rounded-2xl bg-[#F3FAF5] border border-[#E3EAE5] hover:border-[#16834A]/40 transition-colors"
                  >
                    <p className="font-bold text-[#17231C]">Live Queue Pass</p>
                    <p className="text-[#66736B] mt-0.5">View current position</p>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Booking Modal */}
      {demoBusiness && (
        <BookAppointmentModal
          isOpen={bookingModalOpen}
          onClose={() => setBookingModalOpen(false)}
          business={demoBusiness}
          onBookingSuccess={() => {
            fetchUpcoming();
            fetchTicket();
          }}
        />
      )}
    </div>
  );
}
