import WorkingHours from '../models/workingHours.model.js';
import Service from '../models/service.model.js';
import Appointment from '../models/appointment.model.js';
import Business from '../models/business.model.js';

/**
 * Converts "HH:mm" time string into total minutes from midnight
 * Example: "09:30" -> 570
 */
export const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Converts total minutes from midnight into "HH:mm" format
 * Example: 570 -> "09:30"
 */
export const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

/**
 * Checks if two time intervals overlap
 * Interval A: [aStart, aEnd], Interval B: [bStart, bEnd]
 */
export const intervalsOverlap = (aStart, aEnd, bStart, bEnd) => {
  return aStart < bEnd && bStart < aEnd;
};

/**
 * Generates conflict-free appointment slots for a given business, service, and date
 * Respects business-level booking closures, holidays, blocked slots, and special hours
 * @param {string} businessId
 * @param {string} serviceId
 * @param {string} dateStr - "YYYY-MM-DD"
 * @param {string} [staffId=null]
 */
export const generateAvailableSlots = async (businessId, serviceId, dateStr, staffId = null) => {
  // 1. Fetch Business & Service
  const [business, service] = await Promise.all([
    Business.findById(businessId),
    Service.findById(serviceId),
  ]);

  if (!business || !business.isActive) {
    throw new Error('Business not found or is currently inactive');
  }

  if (!service || !service.isActive) {
    throw new Error('Service not found or is currently inactive');
  }

  // Check 1: Master Booking Closure Toggle
  if (business.isBookingsOpen === false) {
    return {
      date: dateStr,
      dayOfWeek: null,
      isOpen: false,
      isBookingsOpen: false,
      closureReason: business.closureReason || 'This provider is temporarily not accepting appointments.',
      message: business.closureReason || 'This provider is temporarily not accepting appointments.',
      businessName: business.name,
      serviceName: service.name,
      slots: [],
    };
  }

  // Check 2: Holidays
  const holiday = business.holidays?.find((h) => h.date === dateStr && h.isClosed);
  if (holiday) {
    return {
      date: dateStr,
      dayOfWeek: null,
      isOpen: false,
      isHoliday: true,
      closureReason: `Bookings are closed today due to a public holiday: ${holiday.name}`,
      message: `Bookings are closed today due to a public holiday: ${holiday.name}`,
      businessName: business.name,
      serviceName: service.name,
      slots: [],
    };
  }

  // Check 3: Temporarily Closed Dates
  const closedDate = business.closedDates?.find((c) => c.date === dateStr);
  if (closedDate) {
    return {
      date: dateStr,
      dayOfWeek: null,
      isOpen: false,
      closureReason: closedDate.reason || 'Bookings temporarily closed for this date.',
      message: closedDate.reason || 'Bookings temporarily closed for this date.',
      businessName: business.name,
      serviceName: service.name,
      slots: [],
    };
  }

  const duration = service.durationMinutes;

  // 2. Parse Day of Week (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetDate = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = targetDate.getUTCDay();

  // 3. Determine Operating Hours (Special hours override vs Regular WorkingHours)
  let openMinutes;
  let closeMinutes;
  let breakStartMinutes = null;
  let breakEndMinutes = null;
  let hasBreak = false;

  const special = business.specialHours?.find((s) => s.date === dateStr);
  if (special) {
    if (!special.isOpen) {
      return {
        date: dateStr,
        dayOfWeek,
        isOpen: false,
        closureReason: special.note || 'Closed for this date per special schedule.',
        message: special.note || 'Closed for this date per special schedule.',
        businessName: business.name,
        serviceName: service.name,
        slots: [],
      };
    }
    openMinutes = timeToMinutes(special.openTime);
    closeMinutes = timeToMinutes(special.closeTime);
  } else {
    // Regular Working Hours
    const schedule = await WorkingHours.findOne({
      businessId,
      staffId: staffId || null,
      dayOfWeek,
    });

    if (!schedule || !schedule.isOpen) {
      return {
        date: dateStr,
        dayOfWeek,
        isOpen: false,
        closureReason: 'Business is closed on this day of the week.',
        message: 'Business is closed on this day of the week.',
        businessName: business.name,
        serviceName: service.name,
        slots: [],
      };
    }

    openMinutes = timeToMinutes(schedule.openTime);
    closeMinutes = timeToMinutes(schedule.closeTime);

    hasBreak = Boolean(schedule.breakStartTime && schedule.breakEndTime);
    breakStartMinutes = hasBreak ? timeToMinutes(schedule.breakStartTime) : null;
    breakEndMinutes = hasBreak ? timeToMinutes(schedule.breakEndTime) : null;
  }

  // 4. Fetch Blocked Slots for this Date
  const blockedForDate = business.blockedSlots?.filter((b) => b.date === dateStr) || [];
  const blockedIntervals = blockedForDate.map((b) => ({
    start: timeToMinutes(b.startTime),
    end: timeToMinutes(b.endTime),
    reason: b.reason,
  }));

  // 5. Fetch existing booked appointments for this date
  const appointmentQuery = {
    businessId,
    appointmentDate: dateStr,
    status: { $in: ['confirmed', 'pending', 'in_progress'] },
  };

  if (staffId) {
    appointmentQuery.staffId = staffId;
  }

  const existingBookings = await Appointment.find(appointmentQuery);

  const bookedIntervals = existingBookings.map((b) => ({
    start: timeToMinutes(b.startTime),
    end: timeToMinutes(b.endTime),
  }));

  // 6. Generate slots
  const slots = [];
  let currentStart = openMinutes;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentMinutesToday = now.getHours() * 60 + now.getMinutes();

  while (currentStart + duration <= closeMinutes) {
    const currentEnd = currentStart + duration;

    // Check break overlap
    let overlapsBreak = false;
    if (hasBreak && intervalsOverlap(currentStart, currentEnd, breakStartMinutes, breakEndMinutes)) {
      overlapsBreak = true;
    }

    // Check booking overlap
    let overlapsBooking = false;
    for (const booked of bookedIntervals) {
      if (intervalsOverlap(currentStart, currentEnd, booked.start, booked.end)) {
        overlapsBooking = true;
        break;
      }
    }

    // Check blocked slots overlap
    let blockedReason = null;
    for (const blocked of blockedIntervals) {
      if (intervalsOverlap(currentStart, currentEnd, blocked.start, blocked.end)) {
        blockedReason = blocked.reason || 'Time Slot Blocked by Provider';
        break;
      }
    }

    // Check past slot
    const isPast = dateStr === todayStr && currentStart <= currentMinutesToday;

    const isAvailable = !overlapsBreak && !overlapsBooking && !blockedReason && !isPast;

    let reason = null;
    if (overlapsBreak) reason = 'Staff / Business Break';
    else if (blockedReason) reason = blockedReason;
    else if (overlapsBooking) reason = 'Already Booked';
    else if (isPast) reason = 'Time Slot Passed';

    slots.push({
      startTime: minutesToTime(currentStart),
      endTime: minutesToTime(currentEnd),
      durationMinutes: duration,
      isAvailable,
      reason,
    });

    currentStart += duration;
  }

  // 7. Load active announcements for customer visibility
  let announcements = [];
  try {
    const { default: Announcement } = await import('../models/announcement.model.js');
    announcements = await Announcement.find({
      businessId,
      isPublished: true,
      startDate: { $lte: dateStr },
      endDate: { $gte: dateStr },
    }).sort({ priority: -1, createdAt: -1 });
  } catch (err) {
    console.warn('Could not load announcements for availability:', err.message);
  }

  return {
    date: dateStr,
    dayOfWeek,
    isOpen: true,
    isBookingsOpen: business.isBookingsOpen !== false,
    businessName: business.name,
    serviceName: service.name,
    durationMinutes: duration,
    price: service.price,
    totalSlots: slots.length,
    availableSlotsCount: slots.filter((s) => s.isAvailable).length,
    slots,
    announcements,
  };
};
