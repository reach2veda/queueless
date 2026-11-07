import Business from '../models/business.model.js';
import WorkingHours from '../models/workingHours.model.js';
import Appointment from '../models/appointment.model.js';
import { timeToMinutes, intervalsOverlap } from '../services/slot.service.js';

/**
 * Helper to fetch provider's business and verify ownership
 */
const getOwnedBusiness = async (userId, userRole) => {
  if (userRole === 'admin') {
    return await Business.findOne({ isActive: true });
  }
  return await Business.findOne({ ownerId: userId, isActive: true });
};

/**
 * Get provider's full booking availability settings
 * Protected: GET /api/availability/provider (Role: provider, admin)
 */
export const getProviderAvailability = async (req, res, next) => {
  try {
    const business = await getOwnedBusiness(req.user._id, req.user.role);
    if (!business) {
      return res.status(404).json({
        success: false,
        error: { message: 'No registered business found for your provider account', statusCode: 404 },
      });
    }

    // Load regular working hours
    const workingHours = await WorkingHours.find({
      businessId: business._id,
      staffId: null,
    }).sort({ dayOfWeek: 1 });

    return res.status(200).json({
      success: true,
      business,
      businessId: business._id,
      businessName: business.name,
      isBookingsOpen: business.isBookingsOpen !== false,
      closureReason: business.closureReason || '',
      holidays: business.holidays || [],
      closedDates: business.closedDates || [],
      blockedSlots: business.blockedSlots || [],
      specialHours: business.specialHours || [],
      workingHours,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle master bookings open/closed
 * Protected: PATCH /api/availability/provider/toggle-bookings (Role: provider, admin)
 */
export const toggleBookings = async (req, res, next) => {
  try {
    const business = await getOwnedBusiness(req.user._id, req.user.role);
    if (!business) {
      return res.status(404).json({
        success: false,
        error: { message: 'Business not found', statusCode: 404 },
      });
    }

    const { isBookingsOpen, closureReason = '' } = req.body;

    business.isBookingsOpen = Boolean(isBookingsOpen);
    business.closureReason = business.isBookingsOpen ? '' : closureReason.trim();
    await business.save();

    // Check if closing bookings impacts any active future appointments
    let affectedAppointments = [];
    if (!business.isBookingsOpen) {
      const todayStr = new Date().toISOString().slice(0, 10);
      affectedAppointments = await Appointment.find({
        businessId: business._id,
        appointmentDate: { $gte: todayStr },
        status: { $in: ['confirmed', 'pending'] },
      })
        .populate('customerId', 'name email phone')
        .populate('serviceId', 'name')
        .limit(10);
    }

    return res.status(200).json({
      success: true,
      message: business.isBookingsOpen
        ? 'Bookings are now OPEN for customer scheduling.'
        : `Bookings have been CLOSED. ${closureReason ? `Reason: "${closureReason}"` : ''}`,
      isBookingsOpen: business.isBookingsOpen,
      closureReason: business.closureReason,
      affectedCount: affectedAppointments.length,
      affectedAppointmentsCount: affectedAppointments.length,
      affectedAppointments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a holiday
 * Protected: POST /api/availability/provider/holidays (Role: provider, admin)
 */
export const addHoliday = async (req, res, next) => {
  try {
    const business = await getOwnedBusiness(req.user._id, req.user.role);
    if (!business) {
      return res.status(404).json({
        success: false,
        error: { message: 'Business not found', statusCode: 404 },
      });
    }

    const { date, name = 'Public Holiday', isClosed = true } = req.body;
    if (!date) {
      return res.status(400).json({
        success: false,
        error: { message: 'Holiday date (YYYY-MM-DD) is required', statusCode: 400 },
      });
    }

    // Check if already added
    const exists = business.holidays.some((h) => h.date === date);
    if (exists) {
      return res.status(409).json({
        success: false,
        error: { message: 'A holiday for this date is already configured', statusCode: 409 },
      });
    }

    business.holidays.push({ date, name, isClosed });
    await business.save();

    // Check affected appointments
    const affected = await Appointment.find({
      businessId: business._id,
      appointmentDate: date,
      status: { $in: ['confirmed', 'pending'] },
    }).populate('customerId', 'name phone');

    return res.status(201).json({
      success: true,
      message: `Holiday "${name}" on ${date} added successfully.`,
      holidays: business.holidays,
      affectedCount: affected.length,
      affectedAppointmentsCount: affected.length,
      warning:
        affected.length > 0
          ? `Warning: There are ${affected.length} existing booking(s) on ${date}. Please review or notify affected patients.`
          : null,
      affectedAppointments: affected,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a holiday
 * Protected: DELETE /api/availability/provider/holidays/:id (Role: provider, admin)
 */
export const deleteHoliday = async (req, res, next) => {
  try {
    const business = await getOwnedBusiness(req.user._id, req.user.role);
    if (!business) {
      return res.status(404).json({ success: false, error: { message: 'Business not found', statusCode: 404 } });
    }

    const { id } = req.params;
    business.holidays = business.holidays.filter(
      (h) => h._id.toString() !== id && h.date !== id
    );
    await business.save();

    return res.status(200).json({
      success: true,
      message: 'Holiday removed successfully',
      holidays: business.holidays,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Temporarily close bookings for a selected date
 * Protected: POST /api/availability/provider/closed-dates (Role: provider, admin)
 */
export const addClosedDate = async (req, res, next) => {
  try {
    const business = await getOwnedBusiness(req.user._id, req.user.role);
    if (!business) {
      return res.status(404).json({ success: false, error: { message: 'Business not found', statusCode: 404 } });
    }

    const { date, reason = 'Closed for the day' } = req.body;
    if (!date) {
      return res.status(400).json({ success: false, error: { message: 'Date is required', statusCode: 400 } });
    }

    const exists = business.closedDates.some((c) => c.date === date);
    if (exists) {
      return res.status(409).json({
        success: false,
        error: { message: 'This date is already marked as closed', statusCode: 409 },
      });
    }

    business.closedDates.push({ date, reason });
    await business.save();

    const affected = await Appointment.find({
      businessId: business._id,
      appointmentDate: date,
      status: { $in: ['confirmed', 'pending'] },
    }).populate('customerId', 'name phone');

    return res.status(201).json({
      success: true,
      message: `Date ${date} marked as closed.`,
      closedDates: business.closedDates,
      affectedCount: affected.length,
      affectedAppointmentsCount: affected.length,
      warning:
        affected.length > 0
          ? `Warning: There are ${affected.length} existing booking(s) on ${date}.`
          : null,
      affectedAppointments: affected,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove closed date
 * Protected: DELETE /api/availability/provider/closed-dates/:id (Role: provider, admin)
 */
export const deleteClosedDate = async (req, res, next) => {
  try {
    const business = await getOwnedBusiness(req.user._id, req.user.role);
    if (!business) {
      return res.status(404).json({ success: false, error: { message: 'Business not found', statusCode: 404 } });
    }

    const { id } = req.params;
    business.closedDates = business.closedDates.filter(
      (c) => c._id.toString() !== id && c.date !== id
    );
    await business.save();

    return res.status(200).json({
      success: true,
      message: 'Closed date removed successfully',
      closedDates: business.closedDates,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Block a specific time slot on a date
 * Protected: POST /api/availability/provider/blocked-slots (Role: provider, admin)
 */
export const addBlockedSlot = async (req, res, next) => {
  try {
    const business = await getOwnedBusiness(req.user._id, req.user.role);
    if (!business) {
      return res.status(404).json({ success: false, error: { message: 'Business not found', statusCode: 404 } });
    }

    const { date, startTime, endTime, reason = 'Time slot blocked' } = req.body;
    if (!date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: { message: 'Date, startTime, and endTime are required', statusCode: 400 },
      });
    }

    business.blockedSlots.push({ date, startTime, endTime, reason });
    await business.save();

    // Check overlapping appointments
    const bStartMins = timeToMinutes(startTime);
    const bEndMins = timeToMinutes(endTime);

    const appointmentsOnDate = await Appointment.find({
      businessId: business._id,
      appointmentDate: date,
      status: { $in: ['confirmed', 'pending'] },
    }).populate('customerId', 'name phone');

    const overlapping = appointmentsOnDate.filter((apt) =>
      intervalsOverlap(bStartMins, bEndMins, timeToMinutes(apt.startTime), timeToMinutes(apt.endTime))
    );

    return res.status(201).json({
      success: true,
      message: `Time slot ${startTime} - ${endTime} on ${date} blocked successfully.`,
      blockedSlots: business.blockedSlots,
      affectedCount: overlapping.length,
      affectedAppointmentsCount: overlapping.length,
      warning:
        overlapping.length > 0
          ? `Warning: There is ${overlapping.length} existing booking during this blocked window.`
          : null,
      affectedAppointments: overlapping,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove blocked slot
 * Protected: DELETE /api/availability/provider/blocked-slots/:id (Role: provider, admin)
 */
export const deleteBlockedSlot = async (req, res, next) => {
  try {
    const business = await getOwnedBusiness(req.user._id, req.user.role);
    if (!business) {
      return res.status(404).json({ success: false, error: { message: 'Business not found', statusCode: 404 } });
    }

    const { id } = req.params;
    business.blockedSlots = business.blockedSlots.filter((b) => b._id.toString() !== id);
    await business.save();

    return res.status(200).json({
      success: true,
      message: 'Blocked slot removed successfully',
      blockedSlots: business.blockedSlots,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update regular 7-day working hours schedule
 * Protected: PUT /api/availability/provider/working-hours (Role: provider, admin)
 */
export const updateWorkingHoursSchedule = async (req, res, next) => {
  try {
    const business = await getOwnedBusiness(req.user._id, req.user.role);
    if (!business) {
      return res.status(404).json({ success: false, error: { message: 'Business not found', statusCode: 404 } });
    }

    const { schedules } = req.body; // Array of 7 day schedule objects
    if (!Array.isArray(schedules)) {
      return res.status(400).json({
        success: false,
        error: { message: 'schedules must be an array of daily schedules', statusCode: 400 },
      });
    }

    for (const item of schedules) {
      await WorkingHours.findOneAndUpdate(
        { businessId: business._id, staffId: null, dayOfWeek: item.dayOfWeek },
        {
          isOpen: item.isOpen,
          openTime: item.openTime || '09:00',
          closeTime: item.closeTime || '17:00',
          breakStartTime: item.breakStartTime || null,
          breakEndTime: item.breakEndTime || null,
        },
        { upsert: true, new: true }
      );
    }

    const updated = await WorkingHours.find({ businessId: business._id, staffId: null }).sort({ dayOfWeek: 1 });

    return res.status(200).json({
      success: true,
      message: 'Regular working hours schedule updated successfully',
      workingHours: updated,
    });
  } catch (error) {
    next(error);
  }
};
