import React from 'react';
import { Clock, Users, CheckCircle2, Ticket } from 'lucide-react';

export default function QueueTicket({
  ticketNumber = 'Q-042',
  businessName = 'Apex Medical Center',
  serviceName = 'General Consultation',
  positionAhead = 2,
  estimatedWait = 14,
  status = 'WAITING', // WAITING | CALLED | SERVING | COMPLETED
  date = 'Today, 10:30 AM',
  className = '',
}) {
  const statusStyles = {
    WAITING: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      dot: 'bg-amber-500',
      label: 'Waiting in Queue',
    },
    CALLED: {
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-200',
      dot: 'bg-blue-500 animate-ping',
      label: 'Please Proceed to Counter',
    },
    SERVING: {
      bg: 'bg-[#EAF6EE]',
      text: 'text-[#11643A]',
      border: 'border-[#16834A]/30',
      dot: 'bg-[#16834A]',
      label: 'Currently Serving',
    },
    COMPLETED: {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-200',
      dot: 'bg-slate-400',
      label: 'Completed',
    },
    SKIPPED: {
      bg: 'bg-orange-50',
      text: 'text-orange-800',
      border: 'border-orange-200',
      dot: 'bg-orange-500',
      label: 'Skipped / Delayed',
    },
    CANCELLED: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      dot: 'bg-red-500',
      label: 'Cancelled',
    },
  };

  const currentStatus = statusStyles[status] || statusStyles.WAITING;

  return (
    <div className={`relative bg-white border border-[#E3EAE5] rounded-3xl p-6 shadow-soft max-w-sm w-full overflow-hidden transition-all duration-300 hover:shadow-soft-lg ${className}`}>
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E3EAE5]">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-[#EAF6EE] text-[#16834A] flex items-center justify-center">
            <Ticket className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#16834A]">QueueLess Pass</h4>
            <p className="text-xs text-[#66736B]">{date}</p>
          </div>
        </div>

        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${currentStatus.bg} ${currentStatus.text} ${currentStatus.border}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${currentStatus.dot}`}></span>
          <span>{currentStatus.label}</span>
        </span>
      </div>

      {/* Main Ticket Number Callout */}
      <div className="py-6 text-center bg-[#F3FAF5] my-4 rounded-2xl border border-[#E3EAE5]/60 relative">
        <p className="text-xs font-medium text-[#66736B]">Your Virtual Queue Number</p>
        <h2 className="text-4xl font-extrabold text-[#11643A] tracking-wider my-1 font-mono">
          {ticketNumber}
        </h2>
        <p className="text-xs font-semibold text-[#17231C]">{serviceName}</p>
        <p className="text-xs text-[#66736B] mt-0.5">{businessName}</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="bg-white border border-[#E3EAE5] rounded-xl p-3 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[#EAF6EE] text-[#16834A] flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] text-[#66736B]">Ahead of You</p>
            <p className="text-sm font-bold text-[#17231C]">
              {positionAhead === 0 ? 'You are next!' : `${positionAhead} people`}
            </p>
          </div>
        </div>

        <div className="bg-white border border-[#E3EAE5] rounded-xl p-3 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[#EAF6EE] text-[#16834A] flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] text-[#66736B]">Est. Wait Time</p>
            <p className="text-sm font-bold text-[#11643A]">
              {estimatedWait <= 0 ? 'Immediate' : `~${estimatedWait} mins`}
            </p>
          </div>
        </div>
      </div>

      {/* Decorative Ticket Perforation Dots */}
      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-50 border border-[#E3EAE5]"></div>
      <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-50 border border-[#E3EAE5]"></div>
    </div>
  );
}

