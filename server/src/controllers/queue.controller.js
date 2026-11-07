import mongoose from 'mongoose';
import Queue from '../models/queue.model.js';
import QueueEntry from '../models/queueEntry.model.js';
import Appointment from '../models/appointment.model.js';
import Business from '../models/business.model.js';
import Service from '../models/service.model.js';
import Staff from '../models/staff.model.js';
import {
  getOrCreateDailyQueue,
  enrollInQueue,
  callNextCustomer,
  updateEntryStatus,
  calculateQueuePositionAndWait,
} from '../services/queue.service.js';

/**
 * Join queue as a walk-in customer
 * Protected: POST /api/queues/join
 */
export const joinQueue = async (req, res, next) => {
  try {
    const customerId = req.user._id;
    const { businessId, serviceId, staffId = null, customerPhone = '' } = req.body;

    if (!businessId || !serviceId) {
      return res.status(400).json({
        success: false,
        error: { message: 'businessId and serviceId are required', statusCode: 400 },
      });
    }

    // 1. Get or create today's queue session
    const queue = await getOrCreateDailyQueue(businessId, serviceId, staffId);

    // 2. Enroll customer
    const result = await enrollInQueue({
      queueId: queue._id,
      customerId,
      customerName: req.user.name,
      customerPhone: customerPhone || req.user.phone || '',
      source: 'walk_in',
      priority: 0,
    });

    const populatedEntry = await QueueEntry.findById(result.entry._id)
      .populate('customerId', 'name email phone')
      .populate({
        path: 'queueId',
        populate: [
          { path: 'businessId', select: 'name category address' },
          { path: 'serviceId', select: 'name durationMinutes price' },
        ],
      });

    return res.status(result.alreadyCheckedIn ? 200 : 201).json({
      success: true,
      message: result.alreadyCheckedIn
        ? 'You already have an active ticket in this queue session'
        : 'Joined queue successfully!',
      entry: populatedEntry,
      positionAhead: result.positionAhead,
      estimatedWaitMinutes: result.estimatedWaitMinutes,
      isNext: result.isNext,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check in an appointment to join today's queue
 * Protected: POST /api/queues/check-in
 */
export const checkInAppointment = async (req, res, next) => {
  try {
    const { appointmentId } = req.body;

    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        error: { message: 'appointmentId is required', statusCode: 400 },
      });
    }

    const appointment = await Appointment.findById(appointmentId)
      .populate('businessId')
      .populate('serviceId')
      .populate('customerId', 'name phone email');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Appointment not found', statusCode: 404 },
      });
    }

    // Role-based authorization & strict business ownership checks
    if (req.user.role === 'staff') {
      const staffDoc = await Staff.findOne({ userId: req.user._id, isActive: true });
      if (!staffDoc || staffDoc.businessId.toString() !== appointment.businessId._id.toString()) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied: You do not work at the business for this appointment.',
            statusCode: 403,
          },
        });
      }
    } else if (req.user.role === 'provider') {
      if (appointment.businessId.ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied: You do not own the business for this appointment.',
            statusCode: 403,
          },
        });
      }
    } else if (req.user.role === 'customer') {
      if (appointment.customerId._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied: You can only check in your own appointments.',
            statusCode: 403,
          },
        });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied: Unauthorized role.', statusCode: 403 },
      });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot check in a cancelled appointment.', statusCode: 400 },
      });
    }

    if (appointment.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: { message: 'Appointment has already concluded and is completed.', statusCode: 400 },
      });
    }

    // Duplicate Check-In Prevention
    const existingEntry = await QueueEntry.findOne({ appointmentId: appointment._id });
    if (existingEntry) {
      const waitInfo = await calculateQueuePositionAndWait(existingEntry._id);
      return res.status(400).json({
        success: false,
        alreadyCheckedIn: true,
        error: {
          message: `Customer is already checked in with token ${existingEntry.ticketNumber} (Status: ${existingEntry.status}).`,
          statusCode: 400,
        },
        entry: existingEntry,
        ...waitInfo,
      });
    }

    // 1. Get or create queue session for the appointment date
    const queue = await getOrCreateDailyQueue(
      appointment.businessId._id,
      appointment.serviceId._id,
      appointment.staffId || null,
      appointment.appointmentDate
    );

    // 2. Customer details from appointment (NOT staff user's name)
    const customerName = appointment.customerId?.name || 'Customer';
    const customerPhone = appointment.customerId?.phone || '';

    // 3. Enroll in queue with appointment tokenNumber
    const result = await enrollInQueue({
      queueId: queue._id,
      customerId: appointment.customerId._id || appointment.customerId,
      customerName,
      customerPhone,
      source: 'appointment',
      appointmentId: appointment._id,
      ticketNumber: appointment.tokenNumber,
      priority: 1,
    });

    if (result.alreadyCheckedIn) {
      return res.status(400).json({
        success: false,
        alreadyCheckedIn: true,
        error: {
          message: `Customer is already checked in with token ${result.entry?.ticketNumber}.`,
          statusCode: 400,
        },
        entry: result.entry,
        tokenNumber: result.entry?.ticketNumber,
        ticketNumber: result.entry?.ticketNumber,
        positionAhead: result.positionAhead,
        estimatedWaitMinutes: result.estimatedWaitMinutes,
        isNext: result.isNext,
      });
    }

    appointment.status = 'in_progress';
    await appointment.save();

    return res.status(200).json({
      success: true,
      message: `Customer checked in successfully! Token ${appointment.tokenNumber} is now waiting in queue.`,
      entry: result.entry,
      tokenNumber: appointment.tokenNumber,
      ticketNumber: appointment.tokenNumber,
      queuePosition: (result.positionAhead ?? 0) + 1,
      positionAhead: result.positionAhead,
      estimatedWaitMinutes: result.estimatedWaitMinutes,
      isNext: result.isNext,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve current customer's active queue pass
 * Protected: GET /api/queues/my/ticket
 */
export const getMyActiveTicket = async (req, res, next) => {
  try {
    const customerId = req.user._id;

    // 1. Find any active ticket in progress
    let activeEntry = await QueueEntry.findOne({
      customerId,
      status: { $in: ['waiting', 'called', 'serving'] },
    })
      .sort({ createdAt: -1 })
      .populate('customerId', 'name email phone')
      .populate({
        path: 'queueId',
        populate: [
          { path: 'businessId', select: 'name category address contactPhone' },
          { path: 'serviceId', select: 'name durationMinutes price' },
        ],
      });

    // 2. If no active QueueEntry by customerId, check if customer has a checked-in in_progress appointment
    if (!activeEntry) {
      const checkedInApt = await Appointment.findOne({
        customerId,
        status: 'in_progress',
      }).sort({ updatedAt: -1 });

      if (checkedInApt) {
        activeEntry = await QueueEntry.findOne({
          appointmentId: checkedInApt._id,
          status: { $in: ['waiting', 'called', 'serving'] },
        })
          .populate('customerId', 'name email phone')
          .populate({
            path: 'queueId',
            populate: [
              { path: 'businessId', select: 'name category address contactPhone' },
              { path: 'serviceId', select: 'name durationMinutes price' },
            ],
          });
      }
    }

    if (!activeEntry) {
      // Check if they had a recent completed/cancelled appointment to display final status
      const recentApt = await Appointment.findOne({ customerId })
        .sort({ updatedAt: -1 })
        .populate('businessId', 'name category address')
        .populate('serviceId', 'name durationMinutes price');

      if (recentApt && ['completed', 'cancelled'].includes(recentApt.status)) {
        return res.status(200).json({
          success: true,
          hasActiveTicket: false,
          recentTicket: {
            tokenNumber: recentApt.tokenNumber,
            status: recentApt.status,
            businessName: recentApt.businessId?.name || 'Clinic',
            serviceName: recentApt.serviceId?.name || 'General Consultation',
          },
          currentlyServingToken: null,
          totalWaiting: 0,
        });
      }

      return res.status(200).json({
        success: true,
        hasActiveTicket: false,
        ticket: null,
        currentlyServingToken: null,
        totalWaiting: 0,
      });
    }

    // Determine current serving token for this queue session
    let currentlyServingToken = 'None';
    const queueDoc = await Queue.findById(activeEntry.queueId._id).populate('currentServingEntryId');
    if (queueDoc?.currentServingEntryId) {
      currentlyServingToken = queueDoc.currentServingEntryId.ticketNumber;
    }

    // Dynamic wait and position
    const waitInfo = await calculateQueuePositionAndWait(activeEntry._id);
    const totalWaiting = await QueueEntry.countDocuments({
      queueId: activeEntry.queueId._id,
      status: 'waiting',
    });

    return res.status(200).json({
      success: true,
      hasActiveTicket: true,
      ticket: {
        _id: activeEntry._id,
        tokenNumber: activeEntry.ticketNumber,
        ticketNumber: activeEntry.ticketNumber,
        status: activeEntry.status,
        positionAhead: waitInfo.positionAhead,
        estimatedWaitMinutes: waitInfo.estimatedWaitMinutes,
        estimatedWait: waitInfo.estimatedWaitMinutes,
        isNext: waitInfo.isNext,
        counterName: activeEntry.counterName,
        joinedAt: activeEntry.joinedAt,
        calledAt: activeEntry.calledAt,
        startedAt: activeEntry.startedAt,
        businessName: activeEntry.queueId?.businessId?.name || 'Clinic',
        serviceName: activeEntry.queueId?.serviceId?.name || 'General Consultation',
      },
      currentlyServingToken,
      totalWaiting,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve active queue for Admin Operator Terminal
 * Protected: GET /api/queues/admin/live (Role: admin)
 */
export const getAdminLiveQueue = async (req, res, next) => {
  try {
    const { date, queueId } = req.query;
    const targetDate = date || new Date().toISOString().slice(0, 10);

    // 1. Get primary business and service
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
      }
    }
    if (!business) {
      business = await Business.findOne({ isActive: true });
    }

    if (!business) {
      return res.status(404).json({ success: false, error: { message: 'No active business found', statusCode: 404 } });
    }

    let service = await Service.findOne({ businessId: business._id, isActive: true });
    if (!service) {
      service = await Service.findOne({ isActive: true });
    }

    const queue = queueId
      ? await Queue.findById(queueId)
      : await getOrCreateDailyQueue(business._id, service?._id, null, targetDate);

    // 2. Fetch all queues for this business and date to give admin a complete front-desk view
    const allQueuesForDate = await Queue.find({
      businessId: business._id,
      queueDate: targetDate,
    });
    const queueIds = allQueuesForDate.map((q) => q._id);
    if (!queueIds.some((qid) => qid.toString() === queue._id.toString())) {
      queueIds.push(queue._id);
    }

    // 3. Fetch currently serving entry across active queues for today
    const currentServing = queue.currentServingEntryId
      ? await QueueEntry.findById(queue.currentServingEntryId).populate('customerId', 'name email phone')
      : await QueueEntry.findOne({ queueId: { $in: queueIds }, status: { $in: ['called', 'serving'] } }).populate('customerId', 'name email phone');

    // 4. Fetch waiting entries
    const waitingEntries = await QueueEntry.find({
      queueId: { $in: queueIds },
      status: 'waiting',
    })
      .sort({ priority: -1, sequenceNumber: 1 })
      .populate('customerId', 'name email phone');

    // Calculate wait times for waiting entries
    const waitingWithEstimates = await Promise.all(
      waitingEntries.map(async (entry, idx) => {
        const waitInfo = await calculateQueuePositionAndWait(entry._id);
        return {
          ...entry.toObject(),
          positionAhead: idx,
          estimatedWaitMinutes: waitInfo.estimatedWaitMinutes,
        };
      })
    );

    // 5. Fetch completed and skipped entries
    const completedEntries = await QueueEntry.find({
      queueId: { $in: queueIds },
      status: 'completed',
    })
      .sort({ completedAt: -1 })
      .limit(10)
      .populate('customerId', 'name');

    const skippedEntries = await QueueEntry.find({
      queueId: { $in: queueIds },
      status: { $in: ['skipped', 'cancelled'] },
    })
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate('customerId', 'name');

    return res.status(200).json({
      success: true,
      queueId: queue._id,
      businessName: business.name,
      serviceName: service?.name || 'General Consultation',
      currentlyServing: currentServing,
      currentlyServingToken: currentServing?.ticketNumber || 'None (Queue Idle)',
      waitingList: waitingWithEstimates,
      totalWaiting: waitingEntries.length,
      completedList: completedEntries,
      completedEntries,
      skippedList: skippedEntries,
      skippedEntries,
      totalCompletedToday: completedEntries.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin action: Call Next Token
 * Protected: POST /api/queues/admin/call-next (Role: admin)
 */
export const adminCallNext = async (req, res, next) => {
  try {
    const { queueId, counterName = 'Counter 1', date, serviceId } = req.body;

    let targetQueueId = queueId;
    if (!targetQueueId) {
      const biz = await Business.findOne({ isActive: true });
      const targetDate = date || new Date().toISOString().slice(0, 10);

      // Find all queues for this business (and target date if specified)
      const allQueues = await Queue.find({
        businessId: biz._id,
        queueDate: targetDate,
      });
      const queueIds = allQueues.map((q) => q._id);

      // Find any waiting entry in any active queue for this date
      const waitingEntry = await QueueEntry.findOne({
        queueId: { $in: queueIds },
        status: 'waiting',
      }).sort({ priority: -1, sequenceNumber: 1 });

      if (waitingEntry) {
        targetQueueId = waitingEntry.queueId;
      } else {
        const srv = serviceId
          ? await Service.findById(serviceId)
          : await Service.findOne({ businessId: biz._id, isActive: true });
        const queue = await getOrCreateDailyQueue(biz._id, srv._id, null, targetDate);
        targetQueueId = queue._id;
      }
    }

    const result = await callNextCustomer(targetQueueId, req.user._id, counterName);
    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: { message: result.message || 'No customers are currently waiting in line', statusCode: 404 },
      });
    }

    return res.status(200).json({
      success: true,
      message: `Called next token: ${result.entry.ticketNumber}`,
      tokenNumber: result.entry.ticketNumber,
      calledEntry: result.entry,
      entry: result.entry,
      currentlyServingToken: result.entry.ticketNumber,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin action: Mark Token as Serving
 * Protected: PATCH /api/queues/admin/tokens/:id/serve (Role: admin)
 */
export const adminMarkServing = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid token entry ID', statusCode: 400 } });
    }

    const updated = await updateEntryStatus(id, 'serving', req.user._id);

    return res.status(200).json({
      success: true,
      message: `Token ${updated.ticketNumber} is now SERVING`,
      entry: updated,
      currentlyServingToken: updated.ticketNumber,
    });
  } catch (error) {
    if (error.message.includes('Invalid state transition')) {
      return res.status(400).json({ success: false, error: { message: error.message, statusCode: 400 } });
    }
    next(error);
  }
};

/**
 * Admin action: Mark Token as Completed
 * Protected: PATCH /api/queues/admin/tokens/:id/complete (Role: admin)
 */
export const adminMarkCompleted = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid token entry ID', statusCode: 400 } });
    }

    const updated = await updateEntryStatus(id, 'completed', req.user._id);

    return res.status(200).json({
      success: true,
      message: `Token ${updated.ticketNumber} marked as COMPLETED`,
      entry: updated,
    });
  } catch (error) {
    if (error.message.includes('Invalid state transition')) {
      return res.status(400).json({ success: false, error: { message: error.message, statusCode: 400 } });
    }
    next(error);
  }
};

/**
 * Admin action: Skip Token with a Reason
 * Protected: PATCH /api/queues/admin/tokens/:id/skip (Role: admin)
 */
export const adminSkipToken = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = 'Customer did not respond at counter' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid token entry ID', statusCode: 400 } });
    }

    const updated = await updateEntryStatus(id, 'skipped', req.user._id, reason);

    return res.status(200).json({
      success: true,
      message: `Token ${updated.ticketNumber} marked as SKIPPED`,
      entry: updated,
      reason,
    });
  } catch (error) {
    if (error.message.includes('Invalid state transition')) {
      return res.status(400).json({ success: false, error: { message: error.message, statusCode: 400 } });
    }
    next(error);
  }
};

/**
 * Admin action: Cancel Token
 * Protected: PATCH /api/queues/admin/tokens/:id/cancel (Role: admin)
 */
export const adminCancelToken = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = 'Cancelled by Administrator' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid token entry ID', statusCode: 400 } });
    }

    const updated = await updateEntryStatus(id, 'cancelled', req.user._id, reason);

    return res.status(200).json({
      success: true,
      message: `Token ${updated.ticketNumber} CANCELLED`,
      entry: updated,
      reason,
    });
  } catch (error) {
    if (error.message.includes('Invalid state transition')) {
      return res.status(400).json({ success: false, error: { message: error.message, statusCode: 400 } });
    }
    next(error);
  }
};
