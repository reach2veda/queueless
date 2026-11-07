import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    title: {
      type: String,
      trim: true,
      default: 'Staff Member',
      maxlength: [80, 'Title cannot exceed 80 characters'],
    },
    serviceIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
      },
    ],
    workingDays: {
      type: [Number], // 0: Sunday, 1: Monday, ..., 6: Saturday
      default: [1, 2, 3, 4, 5],
    },
    workingHours: {
      start: {
        type: String,
        default: '09:00',
      },
      end: {
        type: String,
        default: '17:00',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: A user can only be linked once to a business
staffSchema.index({ businessId: 1, userId: 1 }, { unique: true });
staffSchema.index({ businessId: 1, isActive: 1 });

export const Staff = mongoose.model('Staff', staffSchema);
export default Staff;
