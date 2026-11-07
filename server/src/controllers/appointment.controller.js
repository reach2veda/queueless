import Appointment from '../models/appointment.model.js';
import Business from '../models/business.model.js';
import Service from '../models/service.model.js';
import Staff from '../models/staff.model.js';
import QueueEntry from '../models/queueEntry.model.js';
import {
  generateAvailableSlots,
  timeToMinutes,
  minutesToTime,
  intervalsOverlap,
  getNowInTimezone,
} from '../services/slot.service.js';
import { generateBookingReference } from '../utils/reference.js';
import { generateNextAppointmentToken } from '../services/token.service.js';
import { logAuditEvent } from '../utils/auditLogger.js';

/**
 * Check slot availability for a business, service, and date
 * Public / Protected: GET /api/availability?businessId=...&serviceId=...&date=...
 */
export const getAvailability = async (req, res, next) => {
  try {
    const { businessId, serviceId, date, staffId, timezone } = req.query;

    if (!businessId || !serviceId || !date) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'businessId, serviceId, and date (YYYY-MM-DD) query parameters are required',
          statusCode: 400,
        },
      });
    }

    const availability = await generateAvailableSlots(
      businessId,
      serviceId,
      date,
      staffId || null,
      timezone || null
    );

    return res.status(200).json({
      success: true,
      data: availability,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new appointment booking
 * Protected: POST /api/appointments
 */
export const createAppointment = async (req, res, next) => {
  try {
    const customerId = req.user._id;
    const {
      businessId,
      serviceId,
      staffId = null,
      appointmentDate,
      startTime,
      notes = '',
      idempotencyKey,
    } = req.body;

    // 1. Idempotency Check: Return existing appointment if already processed
    if (idempotencyKey) {
      const existingIdempotent = await Appointment.findOne({ idempotencyKey })
        .populate('businessId', 'name category address contactPhone')
        .populate('serviceId', 'name durationMinutes price');

      if (existingIdempotent) {
        return res.status(200).json({
          success: true,
          message: 'Appointment retrieved (idempotent request)',
          appointment: existingIdempotent,
        });
      }
    }

    // 2. Fetch and validate Service & Business
    const [service, business] = await Promise.all([
      Service.findById(serviceId),
      Business.findById(businessId),
    ]);

    if (!business || !business.isActive) {
      return res.status(404).json({
        success: false,
        error: { message: 'Business not found or is currently inactive', statusCode: 404 },
      });
    }

    if (!service || !service.isActive) {
      return res.status(404).json({
        success: false,
        error: { message: 'Selected service does not exist or is inactive', statusCode: 404 },
      });
    }

    // Availability Check 1: Master Booking Closure
    if (business.isBookingsOpen === false) {
      return res.status(400).json({
        success: false,
        error: {
          message: business.closureReason || 'Bookings are currently closed by this provider.',
          statusCode: 400,
        },
      });
    }

    // Availability Check 2: Holiday Closure
    const holiday = business.holidays?.find((h) => h.date === appointmentDate && h.isClosed);
    if (holiday) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Bookings are closed on this date due to a public holiday: ${holiday.name}`,
          statusCode: 400,
        },
      });
    }

    // Availability Check 3: Temporarily Closed Date
    const closedDate = business.closedDates?.find((c) => c.date === appointmentDate);
    if (closedDate) {
      return res.status(400).json({
        success: false,
        error: {
          message: closedDate.reason || 'Bookings are temporarily closed for this date.',
          statusCode: 400,
        },
      });
    }

    // Availability Check 4: Past dates and past time slots
    const effectiveTimezone = business.timezone || 'Asia/Kolkata';
    const { todayStr, currentMinutesToday } = getNowInTimezone(effectiveTimezone);
    if (appointmentDate < todayStr) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Cannot book appointments for past dates.',
          statusCode: 400,
        },
      });
    }

    // 3. Compute endTime from startTime + durationMinutes
    const startMins = timeToMinutes(startTime);
    if (appointmentDate === todayStr && startMins <= currentMinutesToday) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'This time slot has already passed for today. Please select an upcoming slot.',
          statusCode: 400,
        },
      });
    }

    const endMins = startMins + service.durationMinutes;
    const endTime = minutesToTime(endMins);

    // Availability Check 5: Blocked Slots Overlap
    const blockedSlot = business.blockedSlots?.find(
      (b) => b.date === appointmentDate && intervalsOverlap(startMins, endMins, timeToMinutes(b.startTime), timeToMinutes(b.endTime))
    );
    if (blockedSlot) {
      return res.status(409).json({
        success: false,
        error: {
          message: blockedSlot.reason || 'This time slot is blocked by the provider.',
          statusCode: 409,
        },
      });
    }

    // Availability Check 5: Staff validation if staff assigned
    if (staffId) {
      const { default: Staff } = await import('../models/staff.model.js');
      const staffMember = await Staff.findOne({ _id: staffId, businessId, isActive: true });
      if (!staffMember) {
        return res.status(400).json({
          success: false,
          error: { message: 'Assigned staff member is either inactive or not found for this business.', statusCode: 400 },
        });
      }
    }

    // 4. Server-Side Conflict Check (Prevent Double Booking)
    const conflictQuery = {
      businessId,
      appointmentDate,
      status: { $in: ['confirmed', 'pending', 'in_progress'] },
    };

    if (staffId) {
      conflictQuery.staffId = staffId;
    }

    const existingBookings = await Appointment.find(conflictQuery);

    for (const booking of existingBookings) {
      const bStart = timeToMinutes(booking.startTime);
      const bEnd = timeToMinutes(booking.endTime);

      if (intervalsOverlap(startMins, endMins, bStart, bEnd)) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'This time slot is no longer available. Please select another slot.',
            statusCode: 409,
            conflictTime: `${booking.startTime} - ${booking.endTime}`,
          },
        });
      }
    }

    // 5. Generate unique booking reference
    let bookingReference = generateBookingReference();
    let collisionCheck = await Appointment.findOne({ bookingReference });
    while (collisionCheck) {
      bookingReference = generateBookingReference();
      collisionCheck = await Appointment.findOne({ bookingReference });
    }

    // 6. Generate atomic unique sequential queue token (QL001, QL002, ...)
    const tokenNumber = await generateNextAppointmentToken('QL');

    // 7. Save Appointment
    const appointment = new Appointment({
      bookingReference,
      tokenNumber,
      customerId,
      businessId,
      serviceId,
      staffId: staffId || null,
      appointmentDate,
      startTime,
      endTime,
      status: 'confirmed',
      notes,
      idempotencyKey: idempotencyKey || null,
    });

    try {
      await appointment.save();

      await logAuditEvent({
        req,
        action: 'APPOINTMENT_CREATED',
        actionCategory: 'APPOINTMENT',
        description: `Patient consultation "${appointment.bookingReference}" booked for ${appointment.appointmentDate} at ${appointment.startTime}.`,
        resourceType: 'Appointment',
        resourceId: appointment._id,
        resourceName: appointment.bookingReference,
        status: 'success',
        severity: 'info',
        updatedState: {
          appointmentDate: appointment.appointmentDate,
          startTime: appointment.startTime,
          status: appointment.status,
        },
      });
    } catch (saveError) {
      // MongoDB duplicate key error code 11000 (catches concurrent race conditions)
      if (saveError.code === 11000) {
        if (saveError.keyPattern?.tokenNumber) {
          return res.status(500).json({
            success: false,
            error: {
              message: 'Token assignment collision occurred. Please retry your booking.',
              statusCode: 500,
            },
          });
        }
        return res.status(409).json({
          success: false,
          error: {
            message: 'A concurrent request just booked this exact slot. Please choose another time.',
            statusCode: 409,
          },
        });
      }
      throw saveError;
    }

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('businessId', 'name category address contactPhone contactEmail')
      .populate('serviceId', 'name durationMinutes price')
      .populate('staffId', 'title')
      .populate('customerId', 'name email phone');

    return res.status(201).json({
      success: true,
      message: 'Appointment booked successfully!',
      appointment: populatedAppointment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve all appointments for the logged-in customer
 * Protected: GET /api/appointments/my
 */
export const getMyAppointments = async (req, res, next) => {
  try {
    const customerId = req.user._id;
    const { status } = req.query;

    const query = { customerId };
    if (status) {
      if (status.includes(',')) {
        query.status = { $in: status.split(',').map((s) => s.trim()) };
      } else {
        query.status = status;
      }
    }

    const appointments = await Appointment.find(query)
      .sort({ appointmentDate: -1, startTime: -1, createdAt: -1 })
      .populate('businessId', 'name category address contactPhone contactEmail')
      .populate('serviceId', 'name durationMinutes price')
      .populate('staffId', 'name title');

    return res.status(200).json({
      success: true,
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve a single appointment by ID
 * Protected: GET /api/appointments/:id
 */
export const getAppointmentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findById(id)
      .populate('businessId', 'name category address contactPhone ownerId')
      .populate('serviceId', 'name durationMinutes price')
      .populate('staffId', 'title')
      .populate('customerId', 'name email phone');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Appointment not found', statusCode: 404 },
      });
    }

    // Access check: Customer who booked it, business owner, or admin
    const isCustomer = appointment.customerId._id.toString() === req.user._id.toString();
    const isOwner = appointment.businessId.ownerId?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied: You do not have permission to view this booking.', statusCode: 403 },
      });
    }

    return res.status(200).json({
      success: true,
      appointment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel an appointment
 * Protected: PATCH /api/appointments/:id/cancel
 */
export const cancelAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cancellationReason = 'User requested cancellation' } = req.body;

    const appointment = await Appointment.findById(id).populate('businessId', 'ownerId');
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Appointment not found', statusCode: 404 },
      });
    }

    // Authorization: Must be the customer, the business owner, or admin
    const isCustomer = appointment.customerId.toString() === req.user._id.toString();
    const isOwner = appointment.businessId.ownerId?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied: You cannot cancel this appointment.', statusCode: 403 },
      });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: { message: 'This appointment is already cancelled.', statusCode: 400 },
      });
    }

    appointment.status = 'cancelled';
    appointment.cancellationReason = cancellationReason;
    appointment.cancelledAt = new Date();
    appointment.cancelledBy = req.user._id;

    await appointment.save();

    await logAuditEvent({
      req,
      action: 'APPOINTMENT_CANCELLED',
      actionCategory: 'APPOINTMENT',
      description: `Appointment "${appointment.bookingReference}" cancelled. Reason: ${cancellationReason}`,
      resourceType: 'Appointment',
      resourceId: appointment._id,
      resourceName: appointment.bookingReference,
      status: 'success',
      severity: 'warning',
      updatedState: {
        status: 'cancelled',
        cancellationReason,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully. The time slot has been freed.',
      appointment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reschedule an existing appointment
 * Protected: PATCH /api/appointments/:id/reschedule
 */
export const rescheduleAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newDate, newStartTime } = req.body;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Appointment not found', statusCode: 404 },
      });
    }

    const isCustomer = appointment.customerId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied: You cannot reschedule this appointment.', statusCode: 403 },
      });
    }

    const service = await Service.findById(appointment.serviceId);
    const startMins = timeToMinutes(newStartTime);
    const endMins = startMins + service.durationMinutes;
    const newEndTime = minutesToTime(endMins);

    // Check conflict on new date/time
    const conflictQuery = {
      _id: { $ne: appointment._id }, // Exclude self
      businessId: appointment.businessId,
      appointmentDate: newDate,
      status: { $in: ['confirmed', 'pending', 'in_progress'] },
    };

    if (appointment.staffId) {
      conflictQuery.staffId = appointment.staffId;
    }

    const existingBookings = await Appointment.find(conflictQuery);
    for (const booking of existingBookings) {
      const bStart = timeToMinutes(booking.startTime);
      const bEnd = timeToMinutes(booking.endTime);

      if (intervalsOverlap(startMins, endMins, bStart, bEnd)) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'The requested rescheduled time slot is already taken.',
            statusCode: 409,
          },
        });
      }
    }

    appointment.appointmentDate = newDate;
    appointment.startTime = newStartTime;
    appointment.endTime = newEndTime;
    appointment.status = 'confirmed';
    appointment.cancellationReason = null;
    appointment.cancelledAt = null;

    await appointment.save();

    await logAuditEvent({
      req,
      action: 'APPOINTMENT_CANCELLED',
      actionCategory: 'APPOINTMENT',
      description: `Appointment "${appointment.bookingReference}" cancelled. Reason: ${cancellationReason}`,
      resourceType: 'Appointment',
      resourceId: appointment._id,
      resourceName: appointment.bookingReference,
      status: 'success',
      severity: 'warning',
      updatedState: {
        status: 'cancelled',
        cancellationReason,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Appointment rescheduled successfully!',
      appointment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get appointments for current authenticated staff or provider's business
 * Protected: GET /api/appointments/business/all (Role: provider, staff, admin)
 */
export const getProviderAppointments = async (req, res, next) => {
  try {
    let business = null;
    if (req.user.role === 'provider') {
      business = await Business.findOne({ ownerId: req.user._id, isActive: true });
    } else if (req.user.role === 'staff') {
      const staffDoc = await Staff.findOne({ userId: req.user._id, isActive: true });
      if (staffDoc) {
        business = await Business.findById(staffDoc.businessId);
      }
    } else if (req.user.role === 'admin') {
      if (req.query.businessId) {
        business = await Business.findById(req.query.businessId);
      } else {
        business = await Business.findOne({ isActive: true });
      }
    }

    if (!business) {
      return res.status(404).json({
        success: false,
        error: { message: 'No active business profile associated with your staff or provider account', statusCode: 404 },
      });
    }

    const { status, date, startDate, endDate, staffId } = req.query;
    const query = { businessId: business._id };

    if (staffId) {
      query.staffId = staffId;
    }

    if (status && status !== 'all') {
      if (status.includes(',')) {
        query.status = { $in: status.split(',').map((s) => s.trim()) };
      } else {
        query.status = status;
      }
    }
    if (date) {
      query.appointmentDate = date;
    } else if (startDate && endDate) {
      query.appointmentDate = { $gte: startDate, $lte: endDate };
    }

    const appointments = await Appointment.find(query)
      .sort({ appointmentDate: 1, startTime: 1 })
      .populate('customerId', 'name email phone avatarUrl')
      .populate('serviceId', 'name durationMinutes price')
      .populate({
        path: 'staffId',
        populate: { path: 'userId', select: 'name email phone' },
      });

    // Check check-in status for each appointment
    const aptIds = appointments.map((a) => a._id);
    const existingEntries = await QueueEntry.find({ appointmentId: { $in: aptIds } });
    const checkInMap = new Map();
    existingEntries.forEach((entry) => {
      checkInMap.set(entry.appointmentId.toString(), {
        queueEntryId: entry._id,
        tokenNumber: entry.ticketNumber,
        status: entry.status,
        joinedAt: entry.joinedAt,
      });
    });

    const appointmentsWithCheckIn = appointments.map((apt) => {
      const aptObj = apt.toObject ? apt.toObject() : apt;
      const checkInInfo = checkInMap.get(apt._id.toString());
      return {
        ...aptObj,
        isCheckedIn: Boolean(checkInInfo),
        queueStatus: checkInInfo ? checkInInfo.status : null,
        queueEntryId: checkInInfo ? checkInInfo.queueEntryId : null,
      };
    });

    return res.status(200).json({
      success: true,
      businessId: business._id,
      businessName: business.name,
      count: appointmentsWithCheckIn.length,
      appointments: appointmentsWithCheckIn,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign or reassign staff member to an appointment
 * Protected: PATCH /api/appointments/:id/assign-staff (Role: provider, staff, admin)
 */
export const assignStaffToAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { staffId } = req.body;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Appointment not found', statusCode: 404 },
      });
    }

    // Verify ownership
    if (req.user.role !== 'admin') {
      const business = await Business.findById(appointment.businessId);
      if (!business || business.ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          error: { message: 'Access denied: You do not own the business for this appointment', statusCode: 403 },
        });
      }
    }

    if (staffId) {
      const { default: Staff } = await import('../models/staff.model.js');
      const staffMember = await Staff.findOne({
        _id: staffId,
        businessId: appointment.businessId,
        isActive: true,
      });

      if (!staffMember) {
        return res.status(400).json({
          success: false,
          error: { message: 'Selected staff member is either inactive or does not belong to this business', statusCode: 400 },
        });
      }
      appointment.staffId = staffMember._id;
    } else {
      appointment.staffId = null;
    }

    await appointment.save();

    const updated = await Appointment.findById(id)
      .populate('customerId', 'name email phone')
      .populate('serviceId', 'name durationMinutes price')
      .populate({
        path: 'staffId',
        populate: { path: 'userId', select: 'name email phone' },
      });

    return res.status(200).json({
      success: true,
      message: staffId ? 'Staff member assigned successfully' : 'Staff assignment removed',
      appointment: updated,
    });
  } catch (error) {
    next(error);
  }
};

