import React, { useState, useEffect, useCallback } from 'react';
import {
  Ticket,
  Users,
  Clock,
  Play,
  CheckCircle2,
  AlertOctagon,
  SkipForward,
  XCircle,
  Megaphone,
  Radio,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  UserCheck
} from 'lucide-react';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import Button from '../ui/Button';

export default function LiveQueueTerminal({ onQueueActivity }) {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);

  // Queue Data
  const [queueSession, setQueueSession] = useState(null);
  const [currentlyServing, setCurrentlyServing] = useState(null);
  const [waitingList, setWaitingList] = useState([]);
  const [completedList, setCompletedList] = useState([]);
  const [skippedList, setSkippedList] = useState([]);
  const [activeTab, setActiveTab] = useState('waiting'); // 'waiting' | 'completed' | 'skipped'

  const fetchLiveQueue = useCallback(async () => {
    try {
      const res = await api.get('/queues/admin/live');
      if (res.data?.success) {
        setQueueSession(res.data.queue);
        setCurrentlyServing(res.data.currentlyServing || null);
        setWaitingList(res.data.waitingList || []);
        setCompletedList(res.data.completedList || []);
        setSkippedList(res.data.skippedList || []);
      }
    } catch (err) {
      console.error('Failed to load admin live queue:', err);
      setError(err.message || 'Failed to fetch live queue data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Socket setup
  useEffect(() => {
    fetchLiveQueue();

    const socket = getSocket();

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    const handleQueueChange = () => {
      fetchLiveQueue();
      if (onQueueActivity) onQueueActivity();
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('admin:queue-changed', handleQueueChange);
    socket.on('queue:updated', handleQueueChange);

    if (socket.connected) {
      setSocketConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('admin:queue-changed', handleQueueChange);
      socket.off('queue:updated', handleQueueChange);
    };
  }, [fetchLiveQueue, onQueueActivity]);

  // Flash message helper
  const flashSuccess = (msg) => {
    setSuccessMsg(msg);
    setError('');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const flashError = (msg) => {
    setError(msg);
    setTimeout(() => setError(''), 5000);
  };

  // 1. Call Next Token
  const handleCallNext = async () => {
    try {
      setActionLoading(true);
      setError('');
      const res = await api.post('/queues/admin/call-next');
      if (res.data?.success) {
        flashSuccess(`Called next token: ${res.data.tokenNumber}`);
        await fetchLiveQueue();
        if (onQueueActivity) onQueueActivity();
      }
    } catch (err) {
      flashError(err.response?.data?.message || err.message || 'Failed to call next token');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Mark as Serving
  const handleMarkServing = async (tokenId, tokenNum) => {
    try {
      setActionLoading(true);
      setError('');
      const res = await api.patch(`/queues/admin/tokens/${tokenId}/serve`);
      if (res.data?.success) {
        flashSuccess(`Token ${tokenNum || res.data.entry?.ticketNumber} is now SERVING at the counter`);
        await fetchLiveQueue();
        if (onQueueActivity) onQueueActivity();
      }
    } catch (err) {
      flashError(err.response?.data?.message || err.message || 'Failed to transition to Serving');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Mark as Completed
  const handleMarkCompleted = async (tokenId, tokenNum) => {
    try {
      setActionLoading(true);
      setError('');
      const res = await api.patch(`/queues/admin/tokens/${tokenId}/complete`);
      if (res.data?.success) {
        flashSuccess(`Token ${tokenNum || res.data.entry?.ticketNumber} marked as COMPLETED!`);
        await fetchLiveQueue();
        if (onQueueActivity) onQueueActivity();
      }
    } catch (err) {
      flashError(err.response?.data?.message || err.message || 'Failed to complete token');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Skip Token with Reason
  const handleSkipToken = async (tokenId, tokenNum) => {
    const reason = window.prompt(
      `Enter reason for skipping token ${tokenNum}:`,
      'Customer not present at call time'
    );
    if (reason === null) return; // User pressed Cancel

    try {
      setActionLoading(true);
      setError('');
      const res = await api.patch(`/queues/admin/tokens/${tokenId}/skip`, { reason });
      if (res.data?.success) {
        flashSuccess(`Token ${tokenNum} skipped: "${reason}"`);
        await fetchLiveQueue();
        if (onQueueActivity) onQueueActivity();
      }
    } catch (err) {
      flashError(err.response?.data?.message || err.message || 'Failed to skip token');
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Cancel Token with Reason
  const handleCancelToken = async (tokenId, tokenNum) => {
    const reason = window.prompt(
      `Enter reason for cancelling token ${tokenNum}:`,
      'Cancelled by Administrator'
    );
    if (reason === null) return;

    try {
      setActionLoading(true);
      setError('');
      const res = await api.patch(`/queues/admin/tokens/${tokenId}/cancel`, { reason });
      if (res.data?.success) {
        flashSuccess(`Token ${tokenNum} cancelled.`);
        await fetchLiveQueue();
        if (onQueueActivity) onQueueActivity();
      }
    } catch (err) {
      flashError(err.response?.data?.message || err.message || 'Failed to cancel token');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-[#E3EAE5] shadow-card overflow-hidden">
      {/* Terminal Title Bar */}
      <div className="p-6 border-b border-[#E3EAE5] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-white via-[#F3FAF5] to-white">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#16834A] bg-[#EAF6EE] px-2.5 py-1 rounded-full flex items-center space-x-1.5">
              <Megaphone className="w-3.5 h-3.5" />
              <span>Live Queue & Token Terminal</span>
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                socketConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              <Radio className={`w-3 h-3 mr-1 ${socketConnected ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
              {socketConnected ? 'Real-Time Sync Active' : 'Connecting to Server...'}
            </span>
          </div>
          <h3 className="text-xl font-extrabold text-[#17231C]">
            Front Desk Queue Dispatcher
          </h3>
          <p className="text-xs text-[#66736B]">
            Call next tokens, mark serving/completed, and manage customer flow with atomic MongoDB Atlas locking.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLiveQueue}
            leftIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#16834A]' : ''}`} />}
          >
            Refresh Queue
          </Button>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-[#EAF6EE] border border-[#16834A]/30 text-[#11643A] text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-[#16834A] shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Terminal Grid */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Currently Serving / Call Station (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#F3FAF5] rounded-3xl p-6 border border-[#E3EAE5] space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#66736B]">
                Active Service Counter
              </span>
              {currentlyServing && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    currentlyServing.status === 'serving'
                      ? 'bg-[#EAF6EE] text-[#11643A] border-[#16834A]/30 animate-pulse'
                      : 'bg-blue-50 text-blue-800 border-blue-200 animate-bounce'
                  }`}
                >
                  {currentlyServing.status === 'serving' ? '● Serving Now' : '📢 Token Called'}
                </span>
              )}
            </div>

            {/* Large Token Display */}
            <div className="bg-white rounded-2xl p-6 border border-[#E3EAE5] text-center shadow-soft">
              <span className="text-xs font-semibold text-[#66736B] block">Current Token</span>
              <h1 className="text-5xl font-black font-mono text-[#11643A] tracking-wider my-2">
                {currentlyServing ? currentlyServing.ticketNumber : 'IDLE'}
              </h1>

              {currentlyServing ? (
                <div className="space-y-1.5 pt-2 border-t border-[#E3EAE5]/60 mt-3">
                  <p className="text-sm font-bold text-[#17231C]">
                    {currentlyServing.customer?.name || 'Customer'}
                  </p>
                  <p className="text-xs text-[#66736B]">
                    {currentlyServing.service?.name || 'Standard Appointment'} • {currentlyServing.service?.duration || 15} mins
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[#66736B] pt-2">
                  No active customer at the desk. Ready to call the next token.
                </p>
              )}
            </div>

            {/* Primary Action Buttons */}
            <div className="space-y-2.5 pt-1">
              {!currentlyServing ? (
                <button
                  onClick={handleCallNext}
                  disabled={actionLoading || waitingList.length === 0}
                  className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm shadow-soft transition-all flex items-center justify-center space-x-2 ${
                    waitingList.length > 0 && !actionLoading
                      ? 'bg-[#16834A] hover:bg-[#11643A] text-white cursor-pointer active:scale-[0.98]'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Megaphone className="w-4 h-4" />
                  <span>Call Next Token ({waitingList.length} Waiting)</span>
                </button>
              ) : currentlyServing.status === 'called' ? (
                /* When Called: Can Start Serving, Skip, or Cancel */
                <div className="space-y-2">
                  <button
                    onClick={() => handleMarkServing(currentlyServing.id, currentlyServing.ticketNumber)}
                    disabled={actionLoading}
                    className="w-full py-3 px-4 rounded-2xl bg-[#16834A] hover:bg-[#11643A] text-white font-bold text-sm shadow-soft transition-all flex items-center justify-center space-x-2 active:scale-[0.98]"
                  >
                    <Play className="w-4 h-4" />
                    <span>Customer Arrived - Mark as Serving</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleSkipToken(currentlyServing.id, currentlyServing.ticketNumber)}
                      disabled={actionLoading}
                      className="py-2.5 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-800 font-semibold text-xs transition-colors flex items-center justify-center space-x-1"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                      <span>Skip Token</span>
                    </button>

                    <button
                      onClick={() => handleCancelToken(currentlyServing.id, currentlyServing.ticketNumber)}
                      disabled={actionLoading}
                      className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold text-xs transition-colors flex items-center justify-center space-x-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel Token</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* When Serving: Can Mark Complete, Skip, or Cancel */
                <div className="space-y-2">
                  <button
                    onClick={() => handleMarkCompleted(currentlyServing.id, currentlyServing.ticketNumber)}
                    disabled={actionLoading}
                    className="w-full py-3 px-4 rounded-2xl bg-[#16834A] hover:bg-[#11643A] text-white font-bold text-sm shadow-soft transition-all flex items-center justify-center space-x-2 active:scale-[0.98]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete Service & Finalize</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleSkipToken(currentlyServing.id, currentlyServing.ticketNumber)}
                      disabled={actionLoading}
                      className="py-2.5 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-800 font-semibold text-xs transition-colors flex items-center justify-center space-x-1"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                      <span>Hold / Skip</span>
                    </button>

                    <button
                      onClick={() => handleCancelToken(currentlyServing.id, currentlyServing.ticketNumber)}
                      disabled={actionLoading}
                      className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold text-xs transition-colors flex items-center justify-center space-x-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Summary Pill */}
            <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-white border border-[#E3EAE5]">
                <span className="text-[#66736B] block text-[11px]">Waiting</span>
                <span className="font-extrabold text-[#17231C] text-sm">{waitingList.length}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-[#E3EAE5]">
                <span className="text-[#66736B] block text-[11px]">Completed</span>
                <span className="font-extrabold text-[#11643A] text-sm">{completedList.length}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-[#E3EAE5]">
                <span className="text-[#66736B] block text-[11px]">Skipped</span>
                <span className="font-extrabold text-orange-600 text-sm">{skippedList.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Queue Roster Tabs (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          {/* Tab Navigation */}
          <div className="flex items-center space-x-2 border-b border-[#E3EAE5] pb-2">
            <button
              onClick={() => setActiveTab('waiting')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'waiting'
                  ? 'bg-[#16834A] text-white shadow-soft'
                  : 'bg-transparent text-[#66736B] hover:text-[#17231C] hover:bg-[#F3FAF5]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Waiting Line ({waitingList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('completed')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'completed'
                  ? 'bg-[#16834A] text-white shadow-soft'
                  : 'bg-transparent text-[#66736B] hover:text-[#17231C] hover:bg-[#F3FAF5]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completed ({completedList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('skipped')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'skipped'
                  ? 'bg-[#16834A] text-white shadow-soft'
                  : 'bg-transparent text-[#66736B] hover:text-[#17231C] hover:bg-[#F3FAF5]'
              }`}
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Skipped ({skippedList.length})</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 min-h-[300px]">
            {activeTab === 'waiting' && (
              <div className="space-y-2">
                {waitingList.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-[#F3FAF5] border border-[#E3EAE5] text-center space-y-2">
                    <Users className="w-8 h-8 text-[#16834A] mx-auto opacity-40" />
                    <p className="text-sm font-bold text-[#17231C]">No Customers Currently Waiting</p>
                    <p className="text-xs text-[#66736B]">
                      All tokens for today have either been served or no appointments are active.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {waitingList.map((item, idx) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl bg-white border border-[#E3EAE5] hover:border-[#16834A]/40 transition-all flex items-center justify-between shadow-soft-sm"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <span className="w-7 h-7 rounded-xl bg-[#EAF6EE] text-[#16834A] font-extrabold text-xs flex items-center justify-center shrink-0">
                            #{item.positionAhead + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-[#11643A] text-sm">
                                {item.ticketNumber}
                              </span>
                              <span className="text-xs font-semibold text-[#17231C] truncate">
                                {item.customer?.name || 'Customer'}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#66736B] truncate">
                              {item.service?.name || 'Service'} • Est. wait ~{item.estimatedWaitMinutes} mins
                            </p>
                          </div>
                        </div>

                        {/* Inline Actions */}
                        <div className="flex items-center space-x-1.5 shrink-0">
                          <button
                            onClick={() => handleSkipToken(item.id, item.ticketNumber)}
                            title="Skip this token"
                            className="p-1.5 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors"
                          >
                            <SkipForward className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleCancelToken(item.id, item.ticketNumber)}
                            title="Cancel this token"
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'completed' && (
              <div className="space-y-2">
                {completedList.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-[#F3FAF5] border border-[#E3EAE5] text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-[#16834A] mx-auto opacity-40" />
                    <p className="text-sm font-bold text-[#17231C]">No Tokens Completed Yet Today</p>
                    <p className="text-xs text-[#66736B]">
                      Tokens completed at the desk will be archived here with service durations.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {completedList.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl bg-[#F3FAF5]/60 border border-[#E3EAE5] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-3">
                          <CheckCircle2 className="w-4 h-4 text-[#16834A]" />
                          <div>
                            <span className="font-mono font-bold text-[#11643A]">
                              {item.ticketNumber}
                            </span>
                            <span className="text-[#17231C] font-semibold ml-2">
                              {item.customer?.name || 'Customer'}
                            </span>
                            <p className="text-[11px] text-[#66736B]">
                              {item.service?.name || 'Service'}
                            </p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EAF6EE] text-[#11643A]">
                          Completed
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'skipped' && (
              <div className="space-y-2">
                {skippedList.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-[#F3FAF5] border border-[#E3EAE5] text-center space-y-2">
                    <SkipForward className="w-8 h-8 text-orange-500 mx-auto opacity-40" />
                    <p className="text-sm font-bold text-[#17231C]">No Skipped Tokens</p>
                    <p className="text-xs text-[#66736B]">
                      Tokens skipped due to customer absence will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {skippedList.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl bg-orange-50/50 border border-orange-200/60 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-orange-800">
                              {item.ticketNumber}
                            </span>
                            <span className="font-semibold text-[#17231C]">
                              {item.customer?.name || 'Customer'}
                            </span>
                          </div>
                          <p className="text-[11px] text-orange-700 mt-0.5">
                            Reason: {item.skipReason || 'Skipped at counter'}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-800">
                          On Hold
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

