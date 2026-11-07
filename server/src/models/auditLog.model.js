import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    actorName: {
      type: String,
      trim: true,
      default: 'System',
    },
    actorEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    actorRole: {
      type: String,
      trim: true,
      default: 'system',
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Action type is required'],
      trim: true,
      index: true,
    },
    actionCategory: {
      type: String,
      enum: ['AUTH', 'USER_MGMT', 'BUSINESS_MGMT', 'APPOINTMENT', 'SERVICE', 'SECURITY', 'SYSTEM'],
      default: 'SYSTEM',
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    resourceType: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    resourceId: {
      type: String,
      trim: true,
      default: '',
    },
    resourceName: {
      type: String,
      trim: true,
      default: '',
    },
    method: {
      type: String,
      trim: true,
      default: 'GET',
    },
    endpoint: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['success', 'failure', 'blocked'],
      default: 'success',
      index: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info',
      index: true,
    },
    ipAddress: {
      type: String,
      trim: true,
      default: '127.0.0.1',
    },
    userAgent: {
      type: String,
      trim: true,
      default: '',
    },
    previousState: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    updatedState: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable record
  }
);

// High performance compound indexes for filtering and pagination
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actionCategory: 1, createdAt: -1 });
auditLogSchema.index({ actorRole: 1, createdAt: -1 });
auditLogSchema.index({ status: 1, createdAt: -1 });
auditLogSchema.index({ resourceType: 1, createdAt: -1 });
auditLogSchema.index({ actorName: 'text', actorEmail: 'text', description: 'text', resourceName: 'text' });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
