import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Building2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Tag,
  DollarSign,
  Ticket,
  Megaphone,
  Info
} from 'lucide-react';
import api from '../../services/api';
import Button from '../ui/Button';

export default function BookAppointmentModal({
  isOpen,
  onClose,
  business,
  initialServiceId = null,
  onBookingSuccess,
}) {
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(initialServiceId || '');
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to tomorrow or next business day (skips Sunday if closed)
    const target = new Date();
    target.setDate(target.getDate() + 1);
    if (target.getDay() === 0) {
      target.setDate(target.getDate() + 1);
    }
    return target.toISOString().slice(0, 10);
  });
  const [slotsData, setSlotsData] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [notes, setNotes] = useState('');
  const [announcements, setAnnouncements] = useState([]);

  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [bookedAppointment, setBookedAppointment] = useState(null);

  // Fetch services and announcements for this business
  useEffect(() => {
    if (business?._id && isOpen) {
      setLoadingServices(true);
      api
        .get(`/services?businessId=${business._id}`)
        .then((res) => {
          const srvList = res.data.services || [];
          setServices(srvList);
          if (srvList.length > 0) {
            if (!selectedServiceId || !srvList.some((s) => s._id === selectedServiceId)) {
              setSelectedServiceId(srvList[0]._id);
            }
          } else {
            setSelectedServiceId('');
          }
        })
        .catch((err) => {
          setErrorMessage(err.message || 'Failed to load services');
        })
        .finally(() => setLoadingServices(false));

      // Fetch active announcements
      api
        .get(`/announcements/business/${business._id}`)
        .then((res) => {
          setAnnouncements(res.data.announcements || []);
        })
        .catch(() => {
          setAnnouncements([]);
        });
    }
  }, [business?._id, isOpen]);

  // Fetch slots whenever serviceId or date changes
  useEffect(() => {
    if (business?._id && selectedServiceId && selectedDate && isOpen) {
      setLoadingSlots(true);
      setSelectedSlot(null);
      setErrorMessage('');

      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

      api
        .get(
          `/availability?businessId=${business._id}&serviceId=${selectedServiceId}&date=${selectedDate}&timezone=${encodeURIComponent(tz)}`
        )
        .then((res) => {
          setSlotsData(res.data.data);
        })
        .catch((err) => {
          setErrorMessage(err.message || 'Failed to calculate available time slots');
          setSlotsData(null);
        })
        .finally(() => setLoadingSlots(false));
    }
  }, [business?._id, selectedServiceId, selectedDate, isOpen]);

  if (!isOpen) return null;

  // Check master booking closure
  const isMasterClosed = business?.isBookingsOpen === false || slotsData?.isBookingsOpen === false;
  const isDateClosed = Boolean(slotsData && !slotsData.isOpen);
  const isBookingDisabled = isMasterClosed || isDateClosed || !selectedSlot || bookingLoading;

  const handleBooking = async () => {
    if (!selectedSlot) {
      setErrorMessage('Please select a time slot');
      return;
    }

    if (isMasterClosed) {
      setErrorMessage('Bookings are currently closed by this provider.');
      return;
    }

    setBookingLoading(true);
    setErrorMessage('');

    try {
      const payload = {
        businessId: business._id,
        serviceId: selectedServiceId,
        appointmentDate: selectedDate,
        startTime: selectedSlot.startTime,
        notes,
      };

      const response = await api.post('/appointments', payload);
      if (response.data.success) {
        setBookedAppointment(response.data.appointment);
        if (onBookingSuccess) {
          onBookingSuccess(response.data.appointment);
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'Booking conflict or error. Please try another slot.');
    } finally {
      setBookingLoading(false);
    }
  };

  const selectedService = services.find((s) => s._id === selectedServiceId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white border border-[#E3EAE5] rounded-3xl shadow-soft-lg overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[#E3EAE5] flex items-center justify-between bg-white shrink-0">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold text-[#16834A] uppercase tracking-wider bg-[#EAF6EE] px-2.5 py-0.5 rounded-full">
                Appointment Booking
              </span>
              {isMasterClosed ? (
                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                  Bookings Closed
                </span>
              ) : (
                <span className="text-[11px] font-bold text-[#11643A] uppercase tracking-wider bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Bookings Open
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-[#17231C] mt-1">
              {business?.name || 'Schedule Service'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#66736B] hover:text-[#17231C] hover:bg-[#F3FAF5] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {bookedAppointment ? (
            /* Success Confirmation Screen */
            <div className="text-center py-6 space-y-6">
              <div className="w-16 h-16 rounded-full bg-[#EAF6EE] text-[#16834A] flex items-center justify-center mx-auto border-4 border-[#16834A]/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl font-extrabold text-[#17231C]">
                  Appointment Confirmed!
                </h3>
                <p className="text-xs text-[#66736B]">
                  Your appointment and live queue token have been successfully issued.
                </p>
              </div>

              {/* Prominent Queue Token Badge */}
              <div className="bg-[#EAF6EE] rounded-3xl p-5 border-2 border-[#16834A]/30 max-w-sm mx-auto shadow-soft text-center space-y-2">
                <div className="flex items-center justify-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-[#16834A]">
                  <Ticket className="w-4 h-4" />
                  <span>Your Queue Token</span>
                </div>
                <div className="text-4xl font-extrabold font-mono text-[#11643A] tracking-wider py-1">
                  {bookedAppointment.tokenNumber || 'QL001'}
                </div>
                <div className="text-[11px] font-medium text-[#16834A]/80 bg-white/70 rounded-full py-1 px-3 inline-block border border-[#16834A]/20">
                  Present this token number at the reception desk
                </div>
              </div>

              {/* Booking Pass Card */}
              <div className="bg-[#F3FAF5] rounded-3xl p-5 border border-[#E3EAE5] max-w-sm mx-auto text-left space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-[#E3EAE5]">
                  <span className="text-xs font-semibold text-[#66736B]">Booking Reference:</span>
                  <span className="font-mono font-bold text-[#11643A] text-xs bg-white px-2.5 py-1 rounded-lg border border-[#E3EAE5]">
                    {bookedAppointment.bookingReference}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#66736B]">Service:</span>
                    <strong className="text-[#17231C]">
                      {bookedAppointment.serviceId?.name || selectedService?.name}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#66736B]">Provider:</span>
                    <strong className="text-[#17231C]">
                      {bookedAppointment.businessId?.name || business?.name}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#66736B]">Date & Time:</span>
                    <strong className="text-[#16834A]">
                      {bookedAppointment.appointmentDate} • {bookedAppointment.startTime} - {bookedAppointment.endTime}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-center space-x-3">
                <Button variant="primary" size="md" onClick={onClose}>
                  Done & View Appointments
                </Button>
              </div>
            </div>
          ) : (
            /* Booking Form Steps */
            <div className="space-y-6">
              {/* Error Alert */}
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Master Booking Closure Banner */}
              {isMasterClosed && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
                  <div className="flex items-center space-x-2 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>Provider Notice: Bookings Currently Closed</span>
                  </div>
                  <p className="text-xs text-rose-800 leading-relaxed">
                    {slotsData?.closureReason || business?.closureReason || 'This provider is temporarily not accepting appointment bookings.'}
                  </p>
                </div>
              )}

              {/* Active Announcements Display */}
              {announcements.length > 0 && (
                <div className="space-y-2">
                  {announcements.map((ann) => {
                    const isUrgent = ann.priority === 'urgent' || ann.priority === 'high';
                    return (
                      <div
                        key={ann._id}
                        className={`p-3.5 rounded-2xl border flex items-start space-x-3 ${
                          isUrgent
                            ? 'bg-amber-50 border-amber-200 text-amber-900'
                            : 'bg-[#EAF6EE] border-[#16834A]/30 text-[#11643A]'
                        }`}
                      >
                        <Megaphone className={`w-4 h-4 shrink-0 mt-0.5 ${isUrgent ? 'text-amber-600' : 'text-[#16834A]'}`} />
                        <div className="flex-1 text-xs space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold">{ann.title}</span>
                            <span className="text-[10px] font-semibold uppercase px-2 py-0.2 rounded-full bg-white/70 border">
                              {ann.type.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-[11px] opacity-90 leading-relaxed">
                            {ann.description}
                          </p>
                          <p className="text-[10px] opacity-75 font-mono">
                            Effective: {ann.startDate} to {ann.endDate}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* If business has no services configured */}
              {!loadingServices && services.length === 0 ? (
                <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-3">
                  <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
                  <h4 className="font-bold text-[#17231C]">No Services Available</h4>
                  <p className="text-xs text-[#66736B] max-w-sm mx-auto">
                    This provider does not have any active services configured yet. Please select an active provider such as Metro Health Clinic.
                  </p>
                </div>
              ) : (
                <>
                  {/* Step 1: Service Selection */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-[#17231C] uppercase tracking-wider">
                      1. Select Service
                    </label>

                    {loadingServices ? (
                      <p className="text-xs text-[#66736B]">Loading services...</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {services.map((srv) => (
                          <div
                            key={srv._id}
                            onClick={() => setSelectedServiceId(srv._id)}
                            className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                              selectedServiceId === srv._id
                                ? 'bg-[#EAF6EE] border-[#16834A] shadow-soft'
                                : 'bg-white border-[#E3EAE5] hover:border-[#16834A]/40'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <h4 className="font-bold text-[#17231C] text-xs sm:text-sm">
                                {srv.name}
                              </h4>
                              <span className="text-xs font-bold text-[#11643A]">
                                ${srv.price}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#66736B] line-clamp-2 mt-1">
                              {srv.description}
                            </p>
                            <div className="flex items-center space-x-1 text-[11px] text-[#16834A] font-semibold mt-2">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{srv.durationMinutes} mins duration</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Step 2: Date Selection */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-[#17231C] uppercase tracking-wider">
                      2. Select Date
                    </label>
                    <div className="relative max-w-xs">
                      <Calendar className="w-4 h-4 text-[#66736B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="date"
                        min={new Date().toISOString().slice(0, 10)}
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E3EAE5] bg-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#16834A]/25 focus:border-[#16834A]"
                      />
                    </div>
                  </div>

                  {/* Step 3: Conflict-Free Time Slot Selection */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-[#17231C] uppercase tracking-wider">
                        3. Available Time Slots
                      </label>
                      {slotsData && slotsData.isOpen && (
                        <span className="text-xs text-[#16834A] font-semibold">
                          {slotsData.availableSlotsCount} of {slotsData.totalSlots} slots open
                        </span>
                      )}
                    </div>

                    {loadingSlots ? (
                      <div className="py-8 text-center text-xs text-[#66736B] flex items-center justify-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-[#16834A] animate-ping"></span>
                        <span>Calculating real-time availability from working hours & bookings...</span>
                      </div>
                    ) : !selectedServiceId ? (
                      <div className="p-4 rounded-2xl bg-[#F3FAF5] border border-[#E3EAE5] text-[#66736B] text-xs text-center">
                        Please select a service above to view available time slots.
                      </div>
                    ) : isMasterClosed ? (
                      <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-slate-600 text-xs text-center">
                        Appointment scheduling is currently paused by this provider.
                      </div>
                    ) : slotsData && !slotsData.isOpen ? (
                      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start space-x-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">No slots available on this date</span>
                          <span>{slotsData?.closureReason || slotsData?.message || 'The business is closed or on holiday on this date. Please select another date.'}</span>
                        </div>
                      </div>
                    ) : slotsData && slotsData.isOpen && slotsData.slots?.length === 0 ? (
                      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs text-center">
                        No operating hours configured for this date.
                      </div>
                    ) : slotsData && slotsData.isOpen && slotsData.availableSlotsCount === 0 ? (
                      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start space-x-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">All slots fully booked</span>
                          <span>All appointment slots for this date have been reserved. Please select another date.</span>
                        </div>
                      </div>
                    ) : slotsData && slotsData.slots ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {slotsData.slots.map((slot, index) => {
                          const isSelected = selectedSlot?.startTime === slot.startTime;

                          if (!slot.isAvailable) {
                            return (
                              <div
                                key={index}
                                title={slot.reason || 'Unavailable'}
                                className="p-2.5 rounded-xl border border-dashed border-[#E3EAE5] bg-slate-50 text-slate-400 text-center text-xs opacity-60 cursor-not-allowed select-none"
                              >
                                <span className="font-mono font-medium block">
                                  {slot.startTime}
                                </span>
                                <span className="text-[10px] block truncate">
                                  {slot.reason === 'Already Booked' ? 'Booked' : slot.reason || 'Unavailable'}
                                </span>
                              </div>
                            );
                          }

                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => setSelectedSlot(slot)}
                              className={`p-2.5 rounded-xl border text-center transition-all ${
                                isSelected
                                  ? 'bg-[#16834A] text-white border-[#16834A] shadow-sm font-bold'
                                  : 'bg-white border-[#E3EAE5] text-[#17231C] hover:border-[#16834A]/50 hover:bg-[#F3FAF5]'
                              }`}
                            >
                              <span className="font-mono font-semibold text-xs block">
                                {slot.startTime} - {slot.endTime}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>

                  {/* Step 4: Notes (Optional) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#17231C]">
                      Appointment Notes / Symptoms (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Follow-up consultation or specific symptoms..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full p-3 rounded-xl border border-[#E3EAE5] bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#16834A]/25 focus:border-[#16834A]"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!bookedAppointment && (
          <div className="px-6 py-4 border-t border-[#E3EAE5] bg-[#F3FAF5] flex items-center justify-between shrink-0">
            <div className="text-xs text-[#66736B]">
              {isMasterClosed ? (
                <span className="text-rose-700 font-semibold">Bookings temporarily closed</span>
              ) : selectedSlot ? (
                <span>
                  Slot: <strong className="text-[#17231C]">{selectedSlot.startTime}</strong> on {selectedDate}
                </span>
              ) : (
                <span>Choose a time slot to continue</span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isBookingDisabled}
                isLoading={bookingLoading}
                onClick={handleBooking}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Confirm Booking
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
