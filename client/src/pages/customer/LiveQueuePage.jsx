import React, { useState, useEffect, useCallback } from 'react';
import { Ticket, Clock, Users, Building2, Bell, RefreshCw, AlertCircle, ArrowLeft, CheckCircle2, AlertTriangle, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardSidebar from '../../components/layout/DashboardSidebar';
import DashboardNavbar from '../../components/layout/DashboardNavbar';
import QueueTicket from '../../components/ui/QueueTicket';
import Button from '../../components/ui/Button';
import api from '../../services/api';
import { getSocket } from '../../services/socket';

export default function LiveQueuePage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [ticketData, setTicketData] = useState(null);
  const [hasTicket, setHasTicket] = useState(false);
  const [currentlyServing, setCurrentlyServing] = useState('None (Queue Idle)');
  const [totalWaiting, setTotalWaiting] = useState(0);
  const [socketConnected, setSocketConnected] = useState(false);
  const [realtimeNotification, setRealtimeNotification] = useState(null);

  const fetchLiveTicket = useCallback(async () => {
    try {
      const res = await api.get('/queues/my/ticket');
      if (res.data.success && res.data.hasActiveTicket) {
        setHasTicket(true);
        setTicketData(res.data.ticket);
        setCurrentlyServing(res.data.currentlyServingToken || 'None (Queue Idle)');
        setTotalWaiting(res.data.totalWaiting || 0);
      } else {
        setHasTicket(false);
        setTicketData(null);
        setCurrentlyServing(res.data?.currentlyServingToken || 'None (Queue Idle)');
      }
    } catch (err) {
      console.error('Error fetching live queue ticket:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch and Socket.IO real-time binding
  useEffect(() => {
    fetchLiveTicket();

    const socket = getSocket();

    const onConnect = () => {
      setSocketConnected(true);
    };

    const onDisconnect = () => {
      setSocketConnected(false);
    };

    const onQueueUpdate = (data) => {
      if (data?.currentlyServingToken) {
        setCurrentlyServing(data.currentlyServingToken);
      }
      if (typeof data?.totalWaiting === 'number') {
        setTotalWaiting(data.totalWaiting);
      }
      // Re-fetch customer's relative position and estimated wait time
      fetchLiveTicket();
    };

    const onTicketUpdate = (data) => {
      if (data?.ticket) {
        setTicketData((prev) => ({
          ...prev,
          ...data.ticket,
        }));

        if (data.status === 'called') {
          setRealtimeNotification({
            type: 'alert',
            title: 'Your Token has been Called!',
            message: `Token ${data.ticket.tokenNumber} is now requested at the counter. Please step forward.`,
          });
        } else if (data.status === 'serving') {
          setRealtimeNotification({
            type: 'success',
            title: 'Currently Serving',
            message: `Token ${data.ticket.tokenNumber} is currently receiving service at the counter.`,
          });
        } else if (data.status === 'completed') {
          setRealtimeNotification({
            type: 'info',
            title: 'Service Completed',
            message: `Token ${data.ticket.tokenNumber} service has concluded. Thank you for choosing QueueLess!`,
          });
        } else if (data.status === 'skipped') {
          setRealtimeNotification({
            type: 'warning',
            title: 'Token Temporarily Skipped',
            message: `Token ${data.ticket.tokenNumber} was marked as skipped. Please speak with reception to be re-called.`,
          });
        } else if (data.status === 'cancelled') {
          setRealtimeNotification({
            type: 'danger',
            title: 'Queue Entry Cancelled',
            message: `Token ${data.ticket.tokenNumber} has been cancelled.`,
          });
        }
      }
      fetchLiveTicket();
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('queue:updated', onQueueUpdate);
    socket.on('user:ticket-updated', onTicketUpdate);

    if (socket.connected) {
      setSocketConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('queue:updated', onQueueUpdate);
      socket.off('user:ticket-updated', onTicketUpdate);
    };
  }, [fetchLiveTicket]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchLiveTicket();
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'called':
        return { label: 'Called (Proceed to Counter)', bg: 'bg-blue-50 text-blue-800 border-blue-200 animate-pulse' };
      case 'serving':
        return { label: 'Currently Serving', bg: 'bg-[#EAF6EE] text-[#11643A] border-[#16834A]/30' };
      case 'completed':
        return { label: 'Completed', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
      case 'skipped':
        return { label: 'Skipped / On Hold', bg: 'bg-orange-50 text-orange-800 border-orange-200' };
      case 'cancelled':
        return { label: 'Cancelled', bg: 'bg-red-50 text-red-700 border-red-200' };
      case 'waiting':
      default:
        return { label: 'Waiting in Queue', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
    }
  };

  const statusInfo = getStatusBadge(ticketData?.status);

  return (
    <div className="min-h-screen bg-[#F3FAF5] flex">
      <DashboardSidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardNavbar title="Live Virtual Queue" toggleSidebar={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Header */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EAE5] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#16834A] bg-[#EAF6EE] px-2.5 py-1 rounded-full">
                  Real-Time Queue Pass
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                  socketConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  <Radio className={`w-3 h-3 mr-1 ${socketConnected ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
                  {socketConnected ? 'Live Synchronized' : 'Connecting...'}
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-[#17231C]">
                Your Live Virtual Queue
              </h2>
              <p className="text-xs sm:text-sm text-[#66736B]">
                Track your live token position and estimated waiting time in real-time.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                leftIcon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#16834A]' : ''}`} />}
              >
                Refresh Queue
              </Button>
            </div>
          </div>

          {/* Real-time Call Alert Banner */}
          {realtimeNotification && (
            <div className={`p-4 rounded-2xl border flex items-start justify-between space-x-3 shadow-soft transition-all animate-fade-in ${
              realtimeNotification.type === 'alert'
                ? 'bg-blue-50 border-blue-200 text-blue-900'
                : realtimeNotification.type === 'danger'
                ? 'bg-red-50 border-red-200 text-red-900'
                : realtimeNotification.type === 'warning'
                ? 'bg-orange-50 border-orange-200 text-orange-900'
                : 'bg-[#EAF6EE] border-[#16834A]/30 text-[#11643A]'
            }`}>
              <div className="flex items-start space-x-3">
                <Bell className="w-5 h-5 shrink-0 mt-0.5 animate-bounce" />
                <div>
                  <h4 className="font-bold text-sm">{realtimeNotification.title}</h4>
                  <p className="text-xs mt-0.5 opacity-90">{realtimeNotification.message}</p>
                </div>
              </div>
              <button
                onClick={() => setRealtimeNotification(null)}
                className="text-xs font-semibold px-2 py-1 rounded-lg hover:bg-black/5"
              >
                Dismiss
              </button>
            </div>
          )}

          {loading ? (
            <div className="bg-white rounded-3xl p-12 border border-[#E3EAE5] text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-[#16834A] animate-spin mx-auto" />
              <p className="text-sm font-semibold text-[#66736B]">Connecting to Queue Stream...</p>
            </div>
          ) : hasTicket && ticketData ? (
            /* Active Queue Display */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-6 flex justify-center">
                <QueueTicket
                  ticketNumber={ticketData.tokenNumber}
                  businessName={ticketData.businessName || 'QueueLess Verified Partner'}
                  serviceName={ticketData.serviceName || 'General Consultation'}
                  positionAhead={ticketData.positionAhead}
                  estimatedWait={ticketData.estimatedWaitMinutes}
                  status={ticketData.status ? ticketData.status.toUpperCase() : 'WAITING'}
                  date={`${ticketData.appointmentDate || 'Today'} • ${ticketData.startTime || ''}`}
                  className="w-full max-w-md shadow-card"
                />
              </div>

              <div className="lg:col-span-6 space-y-6">
                <div className="bg-white rounded-3xl p-6 border border-[#E3EAE5] shadow-card space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[#17231C] text-base">Live Queue Insights</h3>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${statusInfo.bg}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  <div className="space-y-3 text-xs sm:text-sm">
                    <div className="p-4 rounded-2xl bg-[#F3FAF5] border border-[#E3EAE5] flex items-center justify-between">
                      <div>
                        <span className="text-[#66736B] block text-xs">Currently Serving Token:</span>
                        <span className="text-xs text-[#16834A] font-medium">Counter Front Desk</span>
                      </div>
                      <span className="font-mono font-black text-[#11643A] text-xl bg-white px-3 py-1.5 rounded-xl border border-[#16834A]/20 shadow-sm">
                        {currentlyServing}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-2xl bg-[#F3FAF5] border border-[#E3EAE5]">
                        <span className="text-[#66736B] block text-xs">People Ahead</span>
                        <span className="font-bold text-lg text-[#17231C]">
                          {ticketData.positionAhead === 0 ? 'Next in line!' : `${ticketData.positionAhead} waiting`}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-[#F3FAF5] border border-[#E3EAE5]">
                        <span className="text-[#66736B] block text-xs">Est. Waiting Time</span>
                        <span className="font-bold text-lg text-[#16834A]">
                          {ticketData.estimatedWaitMinutes <= 0 ? 'Immediate' : `~${ticketData.estimatedWaitMinutes} mins`}
                        </span>
                        <span className="block text-[10px] text-[#66736B] mt-0.5">(Estimated)</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#F3FAF5] border border-[#E3EAE5] flex items-center justify-between">
                      <span className="text-[#66736B]">Service Category:</span>
                      <span className="font-semibold text-[#17231C]">{ticketData.serviceName}</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#F3FAF5] border border-[#E3EAE5] flex items-center justify-between">
                      <span className="text-[#66736B]">Appointment Window:</span>
                      <span className="font-semibold text-[#17231C]">{ticketData.startTime}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#EAF6EE] border border-[#16834A]/20 text-[#11643A] text-xs flex items-start space-x-3">
                    <Bell className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Real-Time WebSocket Updates Active</p>
                      <p className="mt-0.5">
                        Your screen automatically updates without manual reloads as the operator calls and completes tokens.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <Link to="/customer/appointments">
                    <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                      Back to My Appointments
                    </Button>
                  </Link>

                  <Link to="/customer/services">
                    <Button variant="outline" size="sm">
                      Browse More Services
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* Empty State when no active pass is present */
            <div className="bg-white rounded-3xl p-10 sm:p-14 border border-[#E3EAE5] text-center max-w-xl mx-auto space-y-4 shadow-card">
              <div className="w-16 h-16 rounded-2xl bg-[#EAF6EE] text-[#16834A] mx-auto flex items-center justify-center">
                <Ticket className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#17231C]">No Active Queue Pass Today</h3>
              <p className="text-sm text-[#66736B] leading-relaxed">
                You do not have any active queue tokens for today. Book an appointment or check your upcoming schedule to receive your real-time queue pass.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/customer/services">
                  <Button variant="primary" size="md">
                    Book an Appointment
                  </Button>
                </Link>
                <Link to="/customer/appointments">
                  <Button variant="outline" size="md">
                    View My Appointments
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
