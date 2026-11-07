import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    createdById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator User ID is required'],
    },
    title: {
      type: String,
      required: [true, 'Announcement title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      required: [true, 'Announcement description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    type: {
      type: String,
      enum: {
        values: [
          'holiday',
          'temporary_closure',
          'booking_delay',
          'new_service',
          'schedule_change',
          'general',
        ],
        message: '{VALUE} is not a valid announcement type',
      },
      default: 'general',
    },
    startDate: {
      type: String, // "YYYY-MM-DD"
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: String, // "YYYY-MM-DD"
      required: [true, 'End date is required'],
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

announcementSchema.index({ businessId: 1, isPublished: 1, startDate: 1, endDate: 1 });

export const Announcement = mongoose.model('Announcement', announcementSchema);
export default Announcement;

