import mongoose from 'mongoose';

const businessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      minlength: [2, 'Business name must be at least 2 characters'],
      maxlength: [100, 'Business name cannot exceed 100 characters'],
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ['clinic', 'salon', 'bank', 'service_center', 'administrative', 'other'],
        message: '{VALUE} is not a supported business category',
      },
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    contactPhone: {
      type: String,
      trim: true,
      default: '',
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    address: {
      street: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' },
      postalCode: { type: String, trim: true, default: '' },
      country: { type: String, trim: true, default: 'US' },
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: '',
    },
    suspensionReason: {
      type: String,
      trim: true,
      default: '',
    },
    licenseNumber: {
      type: String,
      trim: true,
      default: '',
    },
    taxId: {
      type: String,
      trim: true,
      default: '',
    },
    verificationDocuments: [
      {
        name: { type: String, default: 'Registration Document' },
        url: { type: String, default: '' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    timezone: {
      type: String,
      default: 'UTC',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    bannerUrl: {
      type: String,
      default: '',
    },
    logoUrl: {
      type: String,
      default: '',
    },
    // Booking Availability Configuration
    isBookingsOpen: {
      type: Boolean,
      default: true,
    },
    closureReason: {
      type: String,
      trim: true,
      default: '',
    },
    holidays: [
      {
        date: { type: String, required: true }, // "YYYY-MM-DD"
        name: { type: String, default: 'Public Holiday' },
        isClosed: { type: Boolean, default: true },
      },
    ],
    closedDates: [
      {
        date: { type: String, required: true }, // "YYYY-MM-DD"
        reason: { type: String, default: 'Closed for the day' },
      },
    ],
    blockedSlots: [
      {
        date: { type: String, required: true }, // "YYYY-MM-DD"
        startTime: { type: String, required: true }, // "HH:mm"
        endTime: { type: String, required: true }, // "HH:mm"
        reason: { type: String, default: 'Time slot blocked' },
      },
    ],
    specialHours: [
      {
        date: { type: String, required: true }, // "YYYY-MM-DD"
        openTime: { type: String, default: '09:00' },
        closeTime: { type: String, default: '17:00' },
        isOpen: { type: Boolean, default: true },
        note: { type: String, default: '' },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for fast searching and discovery
businessSchema.index({ category: 1, verificationStatus: 1 });
businessSchema.index({ 'address.city': 1 });
businessSchema.index({ name: 'text', description: 'text' });
businessSchema.index({ coordinates: '2dsphere' });

export const Business = mongoose.model('Business', businessSchema);
export default Business;

