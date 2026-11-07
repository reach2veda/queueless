import Counter from '../models/counter.model.js';
import Appointment from '../models/appointment.model.js';

/**
 * Format sequence number into a readable zero-padded token
 * Example: prefix='QL', seq=1 -> "QL001", seq=42 -> "QL042", seq=1000 -> "QL1000"
 */
export const formatTokenNumber = (prefix = 'QL', seq = 1) => {
  const padded = seq.toString().padStart(3, '0');
  return `${prefix}${padded}`;
};

/**
 * Atomically generates the next unique sequential queue token for an appointment.
 * Guarantees zero race conditions under concurrent bookings using MongoDB $inc.
 * Once issued, the token is permanently bound to the appointment and will never
 * be reused or reassigned, even if the appointment is later cancelled.
 *
 * @param {string} [prefix='QL'] - Prefix for token (default: 'QL')
 * @returns {Promise<string>} e.g. "QL001", "QL002"
 */
export const generateNextAppointmentToken = async (prefix = 'QL') => {
  const counterKey = 'appointment_queue_token';

  const counter = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { seq: 1 } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  return formatTokenNumber(prefix, counter.seq);
};

/**
 * Helper to ensure any legacy appointments without tokens are backfilled
 * and the atomic counter is synchronized so sequences never collide.
 */
export const syncLegacyAppointments = async () => {
  const unassigned = await Appointment.find({
    $or: [{ tokenNumber: { $exists: false } }, { tokenNumber: null }],
  }).sort({ createdAt: 1 });

  if (unassigned.length === 0) return;

  const counterKey = 'appointment_queue_token';
  let counter = await Counter.findOne({ key: counterKey });
  let currentSeq = counter ? counter.seq : 0;

  for (const apt of unassigned) {
    currentSeq += 1;
    apt.tokenNumber = formatTokenNumber('QL', currentSeq);
    await apt.save();
  }

  await Counter.findOneAndUpdate(
    { key: counterKey },
    { $set: { seq: currentSeq } },
    { upsert: true }
  );
};

