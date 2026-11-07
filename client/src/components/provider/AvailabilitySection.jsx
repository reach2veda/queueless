import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Power,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Info,
  CalendarX,
  Ban
} from 'lucide-react';
import api from '../../services/api';
import Button from '../ui/Button';

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export default function AvailabilitySection() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [impactWarning, setImpactWarning] = useState(null);

  // Master switch state
  const [isBookingsOpen, setIsBookingsOpen] = useState(true);
  const [closureReason, setClosureReason] = useState('');
  const [togglingMaster, setTogglingMaster] = useState(false);

  // Weekly hours state
  const [workingHours, setWorkingHours] = useState([]);
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Holidays state
  const [holidays, setHolidays] = useState([]);
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '', isClosed: true });
  const [addingHoliday, setAddingHoliday] = useState(false);

  // Closed dates state
  const [closedDates, setClosedDates] = useState([]);
  const [newClosedDate, setNewClosedDate] = useState({ date: '', reason: '' });
  const [addingClosedDate, setAddingClosedDate] = useState(false);

  // Blocked slots state
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [newBlockedSlot, setNewBlockedSlot] = useState({
    date: '',
    startTime: '12:00',
    endTime: '13:00',
    reason: 'Lunch / Staff Break',
  });
  const [addingBlockedSlot, setAddingBlockedSlot] = useState(false);

  const fetchAvailabilitySettings = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/availability/provider/settings');
      if (res.data?.success) {
        const isBookingsOpenVal =
          res.data.isBookingsOpen !== undefined
            ? res.data.isBookingsOpen
            : res.data.business?.isBookingsOpen !== false;
        const closureReasonVal =
          res.data.closureReason !== undefined
            ? res.data.closureReason
            : res.data.business?.closureReason || '';
        const holidaysVal = res.data.holidays || res.data.business?.holidays || [];
        const closedDatesVal = res.data.closedDates || res.data.business?.closedDates || [];
        const blockedSlotsVal = res.data.blockedSlots || res.data.business?.blockedSlots || [];
        const wh = res.data.workingHours || [];

        setIsBookingsOpen(isBookingsOpenVal !== false);
        setClosureReason(closureReasonVal || '');
        setHolidays(holidaysVal);
        setClosedDates(closedDatesVal);
        setBlockedSlots(blockedSlotsVal);

        // Initialize 7 days if not set
        const scheduleMap = {};
        (wh || []).forEach((w) => {
          scheduleMap[w.dayOfWeek] = w;
        });

        const fullDays = [0, 1, 2, 3, 4, 5, 6].map((day) => {
          const found = scheduleMap[day];
          return {
            dayOfWeek: day,
            isOpen: found ? found.isOpen : day !== 0, // default closed Sunday
            openTime: found?.openTime || '09:00',
            closeTime: found?.closeTime || '17:00',
          };
        });

        setWorkingHours(fullDays);
      }
    } catch (err) {
      setError(err.message || 'Failed to load booking availability settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailabilitySettings();
  }, []);

  // 1. Toggle Master Booking Switch
  const handleToggleMasterBookings = async () => {
    const nextState = !isBookingsOpen;
    setTogglingMaster(true);
    setError('');
    setSuccessMsg('');
    setImpactWarning(null);

    try {
      const res = await api.patch('/availability/provider/toggle-bookings', {
        isBookingsOpen: nextState,
        closureReason: nextState ? '' : closureReason || 'Temporarily closed for bookings',
      });

      if (res.data?.success) {
        setIsBookingsOpen(res.data.isBookingsOpen);
        setClosureReason(res.data.closureReason || '');
        setSuccessMsg(res.data.message);

        if (res.data.warning) {
          setImpactWarning({
            warning: res.data.warning,
            count: res.data.affectedAppointmentsCount,
            list: res.data.affectedAppointments || [],
          });
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to update booking status');
    } finally {
      setTogglingMaster(false);
    }
  };

  // 2. Save Weekly Working Hours
  const handleDayChange = (dayIndex, field, value) => {
    setWorkingHours((prev) =>
      prev.map((d) => (d.dayOfWeek === dayIndex ? { ...d, [field]: value } : d))
    );
  };

  const handleSaveWeeklySchedule = async () => {
    setSavingSchedule(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await api.put('/availability/provider/schedule', {
        schedules: workingHours,
      });

      if (res.data?.success) {
        setSuccessMsg('Weekly operating schedule updated successfully');
      }
    } catch (err) {
      setError(err.message || 'Failed to save weekly schedule');
    } finally {
      setSavingSchedule(false);
    }
  };

  // 3. Holidays Management
  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!newHoliday.name || !newHoliday.date) {
      setError('Please provide holiday name and date');
      return;
    }

    setAddingHoliday(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await api.post('/availability/provider/holidays', newHoliday);
      if (res.data?.success) {
        setHolidays(res.data.holidays || []);
        setNewHoliday({ name: '', date: '', isClosed: true });
        setSuccessMsg('Holiday added successfully');
      }
    } catch (err) {
      setError(err.message || 'Failed to add holiday');
    } finally {
      setAddingHoliday(false);
    }
  };

  const handleDeleteHoliday = async (holidayId) => {
    try {
      setError('');
      const res = await api.delete(`/availability/provider/holidays/${holidayId}`);
      if (res.data?.success) {
        setHolidays(res.data.holidays || []);
        setSuccessMsg('Holiday removed');
      }
    } catch (err) {
      setError(err.message || 'Failed to remove holiday');
    }
  };

  // 4. Closed Dates Management
  const handleAddClosedDate = async (e) => {
    e.preventDefault();
    if (!newClosedDate.date) {
      setError('Please select a date to close');
      return;
    }

    setAddingClosedDate(true);
    setError('');
    setSuccessMsg('');
    setImpactWarning(null);

    try {
      const res = await api.post('/availability/provider/closed-dates', newClosedDate);
      if (res.data?.success) {
        setClosedDates(res.data.closedDates || []);
        setNewClosedDate({ date: '', reason: '' });
        setSuccessMsg('Closed date registered');

        if (res.data.warning) {
          setImpactWarning({
            warning: res.data.warning,
            count: res.data.affectedAppointmentsCount,
            list: res.data.affectedAppointments || [],
          });
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to add closed date');
    } finally {
      setAddingClosedDate(false);
    }
  };

  const handleDeleteClosedDate = async (closedDateId) => {
    try {
      setError('');
      const res = await api.delete(`/availability/provider/closed-dates/${closedDateId}`);
      if (res.data?.success) {
        setClosedDates(res.data.closedDates || []);
        setSuccessMsg('Closed date removed');
      }
    } catch (err) {
      setError(err.message || 'Failed to delete closed date');
    }
  };

  // 5. Blocked Slots Management
  const handleAddBlockedSlot = async (e) => {
    e.preventDefault();
    if (!newBlockedSlot.date || !newBlockedSlot.startTime || !newBlockedSlot.endTime) {
      setError('Please provide date, start time, and end time for the blocked slot');
      return;
    }

    setAddingBlockedSlot(true);
    setError('');
    setSuccessMsg('');
    setImpactWarning(null);

    try {
      const res = await api.post('/availability/provider/blocked-slots', newBlockedSlot);
      if (res.data?.success) {
        setBlockedSlots(res.data.blockedSlots || []);
        setNewBlockedSlot({
          date: '',
          startTime: '12:00',
          endTime: '13:00',
          reason: 'Lunch / Staff Break',
        });
        setSuccessMsg('Blocked slot scheduled');

        if (res.data.warning) {
          setImpactWarning({
            warning: res.data.warning,
            count: res.data.affectedAppointmentsCount,
            list: res.data.affectedAppointments || [],
          });
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to add blocked slot');
    } finally {
      setAddingBlockedSlot(false);
    }
  };

  const handleDeleteBlockedSlot = async (slotId) => {
    try {
      setError('');
      const res = await api.delete(`/availability/provider/blocked-slots/${slotId}`);
      if (res.data?.success) {
        setBlockedSlots(res.data.blockedSlots || []);
        setSuccessMsg('Blocked slot removed');
      }
    } catch (err) {
      setError(err.message || 'Failed to remove blocked slot');
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-xs text-[#66736B]">
        Loading availability configurations...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-[#E3EAE5]">
        <h3 className="text-lg font-bold text-[#17231C] flex items-center space-x-2">
          <Clock className="w-5 h-5 text-[#16834A]" />
          <span>Booking Availability & Schedule Controls</span>
        </h3>
        <p className="text-xs text-[#66736B]">
          Configure master booking switches, operating hours, public holidays, and reserved break slots.
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-[#EAF6EE] border border-[#16834A]/30 text-[#11643A] text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-[#16834A] shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Impact Warning Banner */}
      {impactWarning && (
        <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
          <div className="flex items-center space-x-2 font-bold text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Impact Notice: {impactWarning.count} Existing Appointments Affected</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            {impactWarning.warning}
          </p>
          <div className="text-[11px] text-amber-700 bg-white/70 p-2.5 rounded-2xl border border-amber-200/60">
            <strong>Safety Guarantee:</strong> Existing appointments will remain in the database and are NOT deleted. You can review them in the Appointments tab to reassign or notify patients.
          </div>
        </div>
      )}

      {/* Section 1: Master Booking Switch */}
      <div className="p-6 rounded-3xl bg-white border border-[#E3EAE5] shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#16834A] bg-[#EAF6EE] px-2.5 py-0.5 rounded-full">
                Master Booking Toggle
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  isBookingsOpen
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {isBookingsOpen ? '● Accepting Bookings' : '○ Bookings Paused'}
              </span>
            </div>
            <h4 className="text-base font-bold text-[#17231C]">
              Accept New Customer Appointments
            </h4>
            <p className="text-xs text-[#66736B]">
              Turn off to temporarily stop new bookings across all services and dates.
            </p>
          </div>

          <Button
            variant={isBookingsOpen ? 'secondary' : 'primary'}
            size="md"
            isLoading={togglingMaster}
            onClick={handleToggleMasterBookings}
            leftIcon={<Power className="w-4 h-4" />}
          >
            {isBookingsOpen ? 'Close Bookings' : 'Reopen Bookings'}
          </Button>
        </div>

        {/* Reason when closed */}
        <div className="pt-2 border-t border-[#E3EAE5] space-y-2">
          <label className="block text-xs font-semibold text-[#17231C]">
            Customer Notice / Closure Reason (Displayed when closed)
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="e.g. Clinic temporarily closed for facility maintenance until Friday."
              value={closureReason}
              onChange={(e) => setClosureReason(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-[#E3EAE5] text-xs focus:outline-none focus:ring-2 focus:ring-[#16834A]/25"
            />
            {!isBookingsOpen && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleMasterBookings}
              >
                Update Notice
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Regular Working Hours Schedule */}
      <div className="p-6 rounded-3xl bg-white border border-[#E3EAE5] shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-bold text-[#17231C] flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-[#16834A]" />
              <span>Weekly Operating Hours</span>
            </h4>
            <p className="text-xs text-[#66736B]">
              Define standard opening and closing times for each day of the week.
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            isLoading={savingSchedule}
            onClick={handleSaveWeeklySchedule}
          >
            Save Weekly Schedule
          </Button>
        </div>

        <div className="divide-y divide-[#E3EAE5] border border-[#E3EAE5] rounded-2xl overflow-hidden bg-[#F3FAF5]">
          {workingHours.map((wh) => (
            <div
              key={wh.dayOfWeek}
              className={`p-3 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                wh.isOpen ? 'bg-white' : 'bg-slate-50 opacity-60'
              }`}
            >
              <div className="flex items-center space-x-3 w-36">
                <input
                  type="checkbox"
                  id={`day-${wh.dayOfWeek}`}
                  checked={wh.isOpen}
                  onChange={(e) => handleDayChange(wh.dayOfWeek, 'isOpen', e.target.checked)}
                  className="rounded text-[#16834A] focus:ring-[#16834A]"
                />
                <label htmlFor={`day-${wh.dayOfWeek}`} className="font-bold text-[#17231C] cursor-pointer">
                  {DAY_NAMES[wh.dayOfWeek]}
                </label>
              </div>

              {wh.isOpen ? (
                <div className="flex items-center space-x-2">
                  <span className="text-[#66736B]">From:</span>
                  <input
                    type="time"
                    value={wh.openTime}
                    onChange={(e) => handleDayChange(wh.dayOfWeek, 'openTime', e.target.value)}
                    className="px-2 py-1 rounded-lg border border-[#E3EAE5] font-mono text-xs"
                  />
                  <span className="text-[#66736B]">To:</span>
                  <input
                    type="time"
                    value={wh.closeTime}
                    onChange={(e) => handleDayChange(wh.dayOfWeek, 'closeTime', e.target.value)}
                    className="px-2 py-1 rounded-lg border border-[#E3EAE5] font-mono text-xs"
                  />
                </div>
              ) : (
                <span className="text-slate-400 font-semibold italic">Closed All Day</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Grid: Holidays & Closed Dates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Public Holidays */}
        <div className="p-6 rounded-3xl bg-white border border-[#E3EAE5] shadow-card space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-[#17231C] flex items-center space-x-2">
              <CalendarX className="w-4 h-4 text-[#16834A]" />
              <span>Public Holidays</span>
            </h4>
            <p className="text-xs text-[#66736B]">
              Add calendar holidays when your clinic will be closed.
            </p>
          </div>

          <form onSubmit={handleAddHoliday} className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
            <input
              type="text"
              placeholder="Holiday Name (e.g. Labor Day)"
              value={newHoliday.name}
              onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
              className="sm:col-span-6 px-3 py-2 rounded-xl border border-[#E3EAE5] focus:outline-none focus:ring-2 focus:ring-[#16834A]/25"
            />
            <input
              type="date"
              value={newHoliday.date}
              onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
              className="sm:col-span-4 px-2 py-2 rounded-xl border border-[#E3EAE5] focus:outline-none focus:ring-2 focus:ring-[#16834A]/25"
            />
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={addingHoliday}
              className="sm:col-span-2"
            >
              Add
            </Button>
          </form>

          {holidays.length === 0 ? (
            <p className="text-xs text-[#66736B] italic py-3 text-center bg-[#F3FAF5] rounded-2xl">
              No holidays configured.
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {holidays.map((h) => (
                <div
                  key={h._id || h.date}
                  className="p-2.5 rounded-xl border border-[#E3EAE5] bg-[#F3FAF5] flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-[#17231C] block">{h.name}</span>
                    <span className="text-[11px] text-[#66736B] font-mono">{h.date}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteHoliday(h._id)}
                    className="p-1 text-[#66736B] hover:text-rose-600 rounded-lg hover:bg-white"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Temporarily Closed Dates */}
        <div className="p-6 rounded-3xl bg-white border border-[#E3EAE5] shadow-card space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-[#17231C] flex items-center space-x-2">
              <Ban className="w-4 h-4 text-amber-600" />
              <span>Temporarily Closed Dates</span>
            </h4>
            <p className="text-xs text-[#66736B]">
              Block specific calendar dates for renovations, deep cleans, or staff events.
            </p>
          </div>

          <form onSubmit={handleAddClosedDate} className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
            <input
              type="date"
              value={newClosedDate.date}
              onChange={(e) => setNewClosedDate({ ...newClosedDate, date: e.target.value })}
              className="sm:col-span-5 px-2 py-2 rounded-xl border border-[#E3EAE5] focus:outline-none focus:ring-2 focus:ring-[#16834A]/25"
            />
            <input
              type="text"
              placeholder="Reason (e.g. Clinic Audit)"
              value={newClosedDate.reason}
              onChange={(e) => setNewClosedDate({ ...newClosedDate, reason: e.target.value })}
              className="sm:col-span-5 px-3 py-2 rounded-xl border border-[#E3EAE5] focus:outline-none focus:ring-2 focus:ring-[#16834A]/25"
            />
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={addingClosedDate}
              className="sm:col-span-2"
            >
              Close
            </Button>
          </form>

          {closedDates.length === 0 ? (
            <p className="text-xs text-[#66736B] italic py-3 text-center bg-[#F3FAF5] rounded-2xl">
              No temporary closed dates.
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {closedDates.map((c) => (
                <div
                  key={c._id || c.date}
                  className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/60 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-amber-900 block font-mono">{c.date}</span>
                    <span className="text-[11px] text-amber-800">{c.reason || 'Closed'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteClosedDate(c._id)}
                    className="p-1 text-amber-800 hover:text-rose-600 rounded-lg hover:bg-white"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Blocked Slots Section */}
      <div className="p-6 rounded-3xl bg-white border border-[#E3EAE5] shadow-card space-y-4">
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-[#17231C] flex items-center space-x-2">
            <Clock className="w-4 h-4 text-[#16834A]" />
            <span>Blocked Time Intervals / Staff Breaks</span>
          </h4>
          <p className="text-xs text-[#66736B]">
            Block specific hours on a date (e.g. 12:00 - 13:00 for lunch or team meeting).
          </p>
        </div>

        <form onSubmit={handleAddBlockedSlot} className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
          <input
            type="date"
            value={newBlockedSlot.date}
            onChange={(e) => setNewBlockedSlot({ ...newBlockedSlot, date: e.target.value })}
            className="sm:col-span-3 px-2 py-2 rounded-xl border border-[#E3EAE5] focus:outline-none focus:ring-2 focus:ring-[#16834A]/25"
          />
          <input
            type="time"
            value={newBlockedSlot.startTime}
            onChange={(e) => setNewBlockedSlot({ ...newBlockedSlot, startTime: e.target.value })}
            className="sm:col-span-2 px-2 py-2 rounded-xl border border-[#E3EAE5] font-mono focus:outline-none focus:ring-2 focus:ring-[#16834A]/25"
          />
          <input
            type="time"
            value={newBlockedSlot.endTime}
            onChange={(e) => setNewBlockedSlot({ ...newBlockedSlot, endTime: e.target.value })}
            className="sm:col-span-2 px-2 py-2 rounded-xl border border-[#E3EAE5] font-mono focus:outline-none focus:ring-2 focus:ring-[#16834A]/25"
          />
          <input
            type="text"
            placeholder="Reason (e.g. Team Meeting)"
            value={newBlockedSlot.reason}
            onChange={(e) => setNewBlockedSlot({ ...newBlockedSlot, reason: e.target.value })}
            className="sm:col-span-3 px-3 py-2 rounded-xl border border-[#E3EAE5] focus:outline-none focus:ring-2 focus:ring-[#16834A]/25"
          />
          <Button
            variant="primary"
            size="sm"
            type="submit"
            isLoading={addingBlockedSlot}
            className="sm:col-span-2"
          >
            Block Slot
          </Button>
        </form>

        {blockedSlots.length === 0 ? (
          <p className="text-xs text-[#66736B] italic py-3 text-center bg-[#F3FAF5] rounded-2xl">
            No blocked intervals scheduled.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {blockedSlots.map((slot) => (
              <div
                key={slot._id}
                className="p-3 rounded-2xl border border-[#E3EAE5] bg-[#F3FAF5] flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center space-x-1 font-mono font-bold text-[#11643A]">
                    <span>{slot.startTime}</span>
                    <span>-</span>
                    <span>{slot.endTime}</span>
                  </div>
                  <span className="text-[11px] text-[#66736B] block">
                    {slot.date} • {slot.reason || 'Blocked'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteBlockedSlot(slot._id)}
                  className="p-1.5 text-[#66736B] hover:text-rose-600 rounded-lg hover:bg-white"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

