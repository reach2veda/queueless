import mongoose from 'mongoose';

const queueEntrySchema = new mongoose.Schema(
  {
    queueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Queue',
      required: [true, 'Queue ID is required'],
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer ID is required'],
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
      index: true,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    customerPhone: {
      type: String,
      trim: true,
      default: '',
    },
    ticketNumber: {
      type: String, // e.g. "Q001"
      required: [true, 'Ticket number is required'],
      trim: true,
      index: true,
    },
    sequenceNumber: {
      type: Number, // Sequential integer: 1, 2, 3...
      required: true,
    },
    source: {
      type: String,
      enum: ['appointment', 'walk_in'],
      required: true,
    },
    status: {
      type: String,
      enum: ['waiting', 'called', 'serving', 'completed', 'skipped', 'cancelled', 'no_show'],
      default: 'waiting',
      index: true,
    },
    priority: {
      type: Number,
      default: 0, // Higher numbers get served first if prioritized
    },
    counterName: {
      type: String,
      default: 'Counter 1',
      trim: true,
    },
    calledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    calledAt: {
      type: Date,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    serviceDurationSeconds: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast FIFO priority queue querying
queueEntrySchema.index({ queueId: 1, status: 1, priority: -1, sequenceNumber: 1 });

// Prevent duplicate appointment check-in in the same queue session
queueEntrySchema.index(
  { queueId: 1, appointmentId: 1 },
  {
    unique: true,
    partialFilterExpression: { appointmentId: { $ne: null } },
  }
);

// Unique sequential ticket within the queue session
queueEntrySchema.index({ queueId: 1, sequenceNumber: 1 }, { unique: true });

export const QueueEntry = mongoose.model('QueueEntry', queueEntrySchema);
export default QueueEntry;

