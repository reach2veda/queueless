import mongoose from 'mongoose';

const workingHoursSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null, // null means general business opening hours
    },
    dayOfWeek: {
      type: Number,
      required: [true, 'Day of week is required (0 for Sun, 1 for Mon, ..., 6 for Sat)'],
      min: 0,
      max: 6,
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
    openTime: {
      type: String,
      trim: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please use HH:mm format (e.g. 09:00)'],
      default: '09:00',
    },
    closeTime: {
      type: String,
      trim: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please use HH:mm format (e.g. 17:00)'],
      default: '17:00',
    },
    breakStartTime: {
      type: String,
      trim: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please use HH:mm format (e.g. 13:00)'],
      default: null,
    },
    breakEndTime: {
      type: String,
      trim: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please use HH:mm format (e.g. 14:00)'],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: Only one schedule entry per business, staff member, and day of week
workingHoursSchema.index({ businessId: 1, staffId: 1, dayOfWeek: 1 }, { unique: true });

export const WorkingHours = mongoose.model('WorkingHours', workingHoursSchema);
export default WorkingHours;

