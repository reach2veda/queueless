import mongoose from 'mongoose';
import Queue from '../models/queue.model.js';
import QueueEntry from '../models/queueEntry.model.js';
import Service from '../models/service.model.js';
import Business from '../models/business.model.js';
import Appointment from '../models/appointment.model.js';
import { emitQueueUpdate } from '../sockets/queue.socket.js';

/**
 * Format ticket number with zero padding
 * Example: prefix='Q', seq=1 -> "Q001", seq=42 -> "Q042", seq=105 -> "Q105"
 */
export const formatTicketNumber = (prefix = 'Q', sequenceNumber = 1) => {
  const padded = sequenceNumber.toString().padStart(3, '0');
  return `${prefix}${padded}`;
};

/**
 * Find or create today's atomic Queue session for a business and service
 * @param {string} businessId
 * @param {string} serviceId
 * @param {string} [staffId=null]
 * @param {string} [dateStr=null] - "YYYY-MM-DD"
 */
export const getOrCreateDailyQueue = async (
  businessId,
  serviceId,
  staffId = null,
  dateStr = null
) => {
  const queueDate = dateStr || new Date().toISOString().slice(0, 10);

  // Fetch service to determine default average service minutes
  const service = await Service.findById(serviceId);
  const avgMinutes = service?.durationMinutes || 15;

  const filter = {
    businessId,
    serviceId,
    queueDate,
    staffId: staffId || null,
  };

  const update = {
    $setOnInsert: {
      businessId,
      serviceId,
      queueDate,
      staffId: staffId || null,
      ticketPrefix: 'Q',
      lastIssuedNumber: 0,
      currentServingEntryId: null,
      status: 'open',
      averageServiceMinutes: avgMinutes,
      activeStaffCount: 1,
    },
  };

  const queue = await Queue.findOneAndUpdate(filter, update, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });

  return queue;
};

/**
 * Atomically issue the next sequential ticket number for a queue session
 * Uses MongoDB findOneAndUpdate with $inc (guarantees zero race conditions)
 * @param {string} queueId
 */
export const issueNextTicket = async (queueId) => {
  const updatedQueue = await Queue.findByIdAndUpdate(
    queueId,
    { $inc: { lastIssuedNumber: 1 } },
    { new: true }
  );

  if (!updatedQueue) {
    throw new Error('Queue session not found');
  }

  const sequenceNumber = updatedQueue.lastIssuedNumber;
  const ticketNumber = formatTicketNumber(updatedQueue.ticketPrefix, sequenceNumber);

  return { sequenceNumber, ticketNumber, updatedQueue };
};

/**
 * Register a customer into the queue (Walk-in or Appointment Check-in)
 */
export const enrollInQueue = async ({
  queueId,
  customerId,
  customerName,
  customerPhone = '',
  source = 'walk_in',
  appointmentId = null,
  ticketNumber = null,
  priority = 0,
}) => {
  const queue = await Queue.findById(queueId);
  if (!queue) {
    throw new Error('Queue session not found');
  }

  if (queue.status === 'closed') {
    throw new Error('The queue for today is currently closed and not accepting new entries');
  }

  // Deduplication check for appointments: prevent duplicate check-in
  if (appointmentId) {
    const existingCheckIn = await QueueEntry.findOne({ queueId, appointmentId });
    if (existingCheckIn) {
      const waitInfo = await calculateQueuePositionAndWait(existingCheckIn._id);
      return {
        alreadyCheckedIn: true,
        entry: existingCheckIn,
        ...waitInfo,
      };
    }
  }

  // Deduplication check for walk-in active ticket: customer can only hold 1 waiting walk-in ticket per queue
  if (!appointmentId) {
    const existingActive = await QueueEntry.findOne({
      queueId,
      customerId,
      status: { $in: ['waiting', 'called', 'serving'] },
    });

    if (existingActive) {
      const waitInfo = await calculateQueuePositionAndWait(existingActive._id);
      return {
        alreadyCheckedIn: true,
        entry: existingActive,
        ...waitInfo,
      };
    }
  }

  // 1. Atomically issue unique ticket number or use provided appointment token
  let sequenceNumber;
  let finalTicketNumber;

  if (ticketNumber) {
    const updatedQueue = await Queue.findByIdAndUpdate(
      queueId,
      { $inc: { lastIssuedNumber: 1 } },
      { new: true }
    );
    sequenceNumber = updatedQueue.lastIssuedNumber;
    finalTicketNumber = ticketNumber;
  } else {
    const issued = await issueNextTicket(queueId);
    sequenceNumber = issued.sequenceNumber;
    finalTicketNumber = issued.ticketNumber;
  }

  // 2. Create queue entry
  const entry = new QueueEntry({
    queueId,
    customerId,
    customerName,
    customerPhone,
    ticketNumber: finalTicketNumber,
    sequenceNumber,
    source,
    appointmentId: appointmentId || null,
    priority: source === 'appointment' ? Math.max(priority, 1) : priority,
    status: 'waiting',
    joinedAt: new Date(),
  });

  await entry.save();

  const waitInfo = await calculateQueuePositionAndWait(entry._id);

  // Real-time broadcast
  const waitingCount = await QueueEntry.countDocuments({ queueId, status: 'waiting' });
  emitQueueUpdate({
    queueId,
    totalWaiting: waitingCount,
    customerId,
    tokenNumber: finalTicketNumber,
    status: 'waiting',
    ...waitInfo,
  });

  return {
    alreadyCheckedIn: false,
    entry,
    ...waitInfo,
  };
};

/**
 * Atomically call the next customer in line
 * Conditional atomic update ensures two staff members NEVER call the same customer
 */
export const callNextCustomer = async (queueId, staffUserId, counterName = 'Counter 1') => {
  const queue = await Queue.findById(queueId);
  if (!queue) {
    throw new Error('Queue session not found');
  }

  // Atomic findOneAndUpdate: selects highest priority, lowest sequence waiting customer
  const calledEntry = await QueueEntry.findOneAndUpdate(
    {
      queueId,
      status: 'waiting',
    },
    {
      $set: {
        status: 'called',
        calledAt: new Date(),
        calledBy: staffUserId,
        counterName,
      },
    },
    {
      sort: { priority: -1, sequenceNumber: 1 },
      new: true,
    }
  );

  if (!calledEntry) {
    return { success: false, message: 'No customers are currently waiting in this queue' };
  }

  // Update current serving reference on the queue session
  queue.currentServingEntryId = calledEntry._id;
  await queue.save();

  // Update linked appointment if present
  if (calledEntry.appointmentId) {
    await Appointment.findByIdAndUpdate(calledEntry.appointmentId, {
      $set: { status: 'in_progress' },
    });
  }

  // Real-time broadcast
  const waitingCount = await QueueEntry.countDocuments({ queueId, status: 'waiting' });
  emitQueueUpdate({
    queueId,
    currentlyServingToken: calledEntry.ticketNumber,
    totalWaiting: waitingCount,
    customerId: calledEntry.customerId,
    tokenNumber: calledEntry.ticketNumber,
    status: 'called',
    positionAhead: 0,
    estimatedWaitMinutes: 0,
    entry: calledEntry,
  });

  return {
    success: true,
    entry: calledEntry,
  };
};

/**
 * Valid Queue State Machine Transitions
 */
const VALID_TRANSITIONS = {
  waiting: ['called', 'serving', 'cancelled', 'no_show', 'skipped'],
  called: ['serving', 'skipped', 'no_show', 'cancelled'],
  serving: ['completed', 'cancelled', 'skipped'],
  skipped: ['waiting', 'called', 'cancelled', 'no_show'], // Can be recalled back
  completed: [],
  cancelled: [],
  no_show: ['waiting'],
};

/**
 * Safely transition entry status according to state machine rules
 */
export const updateEntryStatus = async (entryId, targetStatus, staffUserId = null, reason = '') => {
  const entry = await QueueEntry.findById(entryId);
  if (!entry) {
    throw new Error('Queue entry not found');
  }

  const allowedNextStates = VALID_TRANSITIONS[entry.status] || [];
  if (!allowedNextStates.includes(targetStatus)) {
    throw new Error(
      `Invalid state transition: Cannot transition queue entry from "${entry.status}" to "${targetStatus}".`
    );
  }

  const updates = { status: targetStatus };

  if (targetStatus === 'serving') {
    updates.startedAt = new Date();
    if (entry.appointmentId) {
      await Appointment.findByIdAndUpdate(entry.appointmentId, { status: 'in_progress' });
    }
  } else if (targetStatus === 'completed') {
    updates.completedAt = new Date();
    if (entry.startedAt) {
      updates.serviceDurationSeconds = Math.round(
        (updates.completedAt.getTime() - entry.startedAt.getTime()) / 1000
      );
    }
    if (entry.appointmentId) {
      await Appointment.findByIdAndUpdate(entry.appointmentId, { status: 'completed' });
    }
  } else if (targetStatus === 'skipped') {
    updates.customerPhone = reason ? `${entry.customerPhone} (Skip reason: ${reason})` : entry.customerPhone;
  } else if (targetStatus === 'cancelled') {
    if (entry.appointmentId) {
      await Appointment.findByIdAndUpdate(entry.appointmentId, {
        status: 'cancelled',
        cancellationReason: reason || 'Cancelled from Queue Operations Terminal',
        cancelledAt: new Date(),
        cancelledBy: staffUserId,
      });
    }
  }

  const updatedEntry = await QueueEntry.findByIdAndUpdate(
    entryId,
    { $set: updates },
    { new: true }
  );

  // If completing or skipping or cancelling, clear currentServingEntryId if it matched
  if (['completed', 'skipped', 'cancelled', 'no_show'].includes(targetStatus)) {
    await Queue.updateOne(
      { _id: entry.queueId, currentServingEntryId: entryId },
      { $set: { currentServingEntryId: null } }
    );
  }

  const queueDoc = await Queue.findById(entry.queueId).populate('currentServingEntryId');
  const currentlyServingToken = queueDoc?.currentServingEntryId?.ticketNumber || null;
  const waitingCount = await QueueEntry.countDocuments({ queueId: entry.queueId, status: 'waiting' });

  emitQueueUpdate({
    queueId: entry.queueId,
    currentlyServingToken,
    totalWaiting: waitingCount,
    customerId: entry.customerId,
    tokenNumber: entry.ticketNumber,
    status: targetStatus,
    entry: updatedEntry,
  });

  return updatedEntry;
};

/**
 * Dynamic Waiting Time & Position Calculator
 * Formula:
 * Estimated Waiting Time = (Customers Ahead * Average Service Duration) / Active Staff Count
 */
export const calculateQueuePositionAndWait = async (entryId) => {
  const entry = await QueueEntry.findById(entryId);
  if (!entry) {
    throw new Error('Queue entry not found');
  }

  if (entry.status !== 'waiting') {
    return {
      positionAhead: 0,
      estimatedWaitMinutes: 0,
      status: entry.status,
      ticketNumber: entry.ticketNumber,
      counterName: entry.counterName,
    };
  }

  const queue = await Queue.findById(entry.queueId);
  const avgMinutes = queue?.averageServiceMinutes || 15;
  const staffCount = Math.max(1, queue?.activeStaffCount || 1);

  // Count waiting customers ahead of this ticket (higher priority OR lower sequence number)
  const customersAhead = await QueueEntry.countDocuments({
    queueId: entry.queueId,
    status: 'waiting',
    $or: [
      { priority: { $gt: entry.priority } },
      { priority: entry.priority, sequenceNumber: { $lt: entry.sequenceNumber } },
    ],
  });

  // Calculate estimated wait
  const rawWait = Math.round((customersAhead * avgMinutes) / staffCount);
  const estimatedWaitMinutes = Math.max(2, rawWait); // Minimum 2 mins estimate for realism

  return {
    ticketNumber: entry.ticketNumber,
    status: entry.status,
    positionAhead: customersAhead,
    estimatedWaitMinutes,
    counterName: entry.counterName,
    isNext: customersAhead === 0,
  };
};

