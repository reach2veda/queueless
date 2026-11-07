import mongoose from 'mongoose';

const queueSchema = new mongoose.Schema(
  {
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
      index: true,
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
    },
    queueDate: {
      type: String, // "YYYY-MM-DD" local business date
      required: [true, 'Queue date is required'],
      index: true,
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    ticketPrefix: {
      type: String,
      default: 'Q',
      trim: true,
      maxlength: 4,
    },
    lastIssuedNumber: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentServingEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QueueEntry',
      default: null,
    },
    status: {
      type: String,
      enum: ['open', 'paused', 'closed'],
      default: 'open',
      index: true,
    },
    averageServiceMinutes: {
      type: Number,
      default: 15,
      min: 1,
    },
    activeStaffCount: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: Only one daily queue session per business, service, and local date
queueSchema.index(
  { businessId: 1, serviceId: 1, queueDate: 1, staffId: 1 },
  { unique: true }
);

export const Queue = mongoose.model('Queue', queueSchema);
export default Queue;

