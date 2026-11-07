import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    tokenNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer ID is required'],
      index: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: [true, 'Service ID is required'],
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
    },
    appointmentDate: {
      type: String, // Stored as "YYYY-MM-DD" for unambiguous local calendar queries
      required: [true, 'Appointment date is required (YYYY-MM-DD)'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'],
      index: true,
    },
    startTime: {
      type: String, // "HH:mm" (e.g. "09:30")
      required: [true, 'Start time is required (HH:mm)'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be HH:mm format'],
    },
    endTime: {
      type: String, // "HH:mm" (e.g. "10:00")
      required: [true, 'End time is required (HH:mm)'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be HH:mm format'],
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'approved', 'in_progress', 'completed', 'cancelled', 'no_show'],
      default: 'confirmed',
      index: true,
    },
    idempotencyKey: {
      type: String,
      default: null,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
appointmentSchema.index({ customerId: 1, status: 1 });
appointmentSchema.index({ businessId: 1, appointmentDate: 1, status: 1 });

// Partial Unique Indexes: Prevent double-booking active slots without blocking cancelled slots
appointmentSchema.index(
  { businessId: 1, staffId: 1, appointmentDate: 1, startTime: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['confirmed', 'approved', 'pending', 'in_progress'] },
      staffId: { $ne: null },
    },
  }
);

appointmentSchema.index(
  { businessId: 1, appointmentDate: 1, startTime: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['confirmed', 'approved', 'pending', 'in_progress'] },
      staffId: null,
    },
  }
);

export const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;

