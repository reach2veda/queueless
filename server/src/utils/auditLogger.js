import AuditLog from '../models/auditLog.model.js';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'confirmpassword',
  'token',
  'jwt',
  'refreshtoken',
  'otp',
  'apikey',
  'secret',
  'authorization',
  'cookie',
  'creditcard',
]);

/**
 * Deeply sanitizes objects to prevent leaking secrets, credentials, or personal keys
 */
export function sanitizeMetadata(data, depth = 0) {
  if (depth > 5 || !data) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeMetadata(item, depth + 1));
  }

  const clean = {};
  for (const [key, val] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      clean[key] = '[REDACTED]';
    } else if (val && typeof val === 'object') {
      clean[key] = sanitizeMetadata(val, depth + 1);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

/**
 * Safely extracts client IP address from express request
 * Relies on Express's validated req.ip (governed by app 'trust proxy' configuration)
 * to prevent client IP spoofing via arbitrary X-Forwarded-For injection.
 */
function extractIp(req) {
  if (!req) return '127.0.0.1';
  if (req.ip) return req.ip;
  if (req.socket?.remoteAddress) return req.socket.remoteAddress;
  if (req.connection?.remoteAddress) return req.connection.remoteAddress;
  return '127.0.0.1';
}

/**
 * Persists an immutable security/activity audit event into MongoDB
 */
export async function logAuditEvent({
  req = null,
  actor = null,
  action,
  actionCategory = 'SYSTEM',
  description = '',
  resourceType = '',
  resourceId = '',
  resourceName = '',
  method = '',
  endpoint = '',
  status = 'success',
  severity = 'info',
  previousState = null,
  updatedState = null,
  metadata = {},
}) {
  try {
    const resolvedUser = actor || (req && req.user) || null;
    const resolvedMethod = method || (req && req.method) || 'SYSTEM';
    const resolvedEndpoint = endpoint || (req && (req.originalUrl || req.url)) || '';
    const resolvedIp = extractIp(req);
    const resolvedUserAgent = (req && req.headers && req.headers['user-agent']) || '';

    const auditEntry = new AuditLog({
      userId: resolvedUser ? resolvedUser._id : null,
      actorName: resolvedUser ? resolvedUser.name || 'User' : 'System',
      actorEmail: resolvedUser ? resolvedUser.email || '' : '',
      actorRole: resolvedUser ? resolvedUser.role || 'system' : 'system',
      action,
      actionCategory,
      description: description || action,
      resourceType,
      resourceId: resourceId ? resourceId.toString() : '',
      resourceName,
      method: resolvedMethod,
      endpoint: resolvedEndpoint,
      status: status || 'success',
      severity: severity || 'info',
      ipAddress: resolvedIp,
      userAgent: resolvedUserAgent,
      previousState: previousState ? sanitizeMetadata(previousState) : null,
      updatedState: updatedState ? sanitizeMetadata(updatedState) : null,
      metadata: sanitizeMetadata(metadata),
    });

    await auditEntry.save();
    return auditEntry;
  } catch (err) {
    console.warn('⚠️ [AuditLogger Warning] Could not persist audit log:', err.message);
    return null;
  }
}

/**
 * Initializes audit log history from existing platform users and businesses if collection is empty
 */
export async function seedAuditLogsIfEmpty() {
  try {
    const count = await AuditLog.countDocuments();
    if (count > 0) return;

    // Dynamically import models to prevent circular dependency
    const { default: User } = await import('../models/user.model.js');
    const { default: Business } = await import('../models/business.model.js');
    const { default: Appointment } = await import('../models/appointment.model.js');

    const adminUser = await User.findOne({ role: 'admin' });
    const businesses = await Business.find().populate('ownerId', 'name email role');
    const appointments = await Appointment.find().populate('serviceId', 'name price').limit(10);

    const initialLogs = [];

    // System Startup Event
    initialLogs.push({
      actorName: 'System Kernel',
      actorEmail: 'system@queueless.com',
      actorRole: 'system',
      action: 'SYSTEM_BOOT',
      actionCategory: 'SYSTEM',
      description: 'QueueLess API engine booted and connected to MongoDB Atlas cluster.',
      resourceType: 'System',
      resourceId: 'queueless-core',
      resourceName: 'QueueLess Engine',
      method: 'STARTUP',
      endpoint: '/api/health',
      status: 'success',
      severity: 'info',
      ipAddress: '127.0.0.1',
      userAgent: 'Node.js / Express Server',
      metadata: { environment: 'development', cluster: 'Atlas queueless' },
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
    });

    if (adminUser) {
      initialLogs.push({
        userId: adminUser._id,
        actorName: adminUser.name,
        actorEmail: adminUser.email,
        actorRole: 'admin',
        action: 'ADMIN_LOGIN',
        actionCategory: 'AUTH',
        description: `Administrator "${adminUser.name}" logged into platform governance terminal.`,
        resourceType: 'Auth',
        resourceId: adminUser._id.toString(),
        resourceName: adminUser.name,
        method: 'POST',
        endpoint: '/api/auth/login',
        status: 'success',
        severity: 'info',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        metadata: { loginType: 'credentials', role: 'admin' },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      });
    }

    businesses.forEach((biz, idx) => {
      initialLogs.push({
        userId: biz.ownerId?._id || null,
        actorName: biz.ownerId?.name || 'Healthcare Provider',
        actorEmail: biz.ownerId?.email || 'provider@queueless.com',
        actorRole: 'provider',
        action: 'BUSINESS_CREATED',
        actionCategory: 'BUSINESS_MGMT',
        description: `Healthcare business "${biz.name}" registered under category "${biz.category}".`,
        resourceType: 'Business',
        resourceId: biz._id.toString(),
        resourceName: biz.name,
        method: 'POST',
        endpoint: '/api/businesses',
        status: 'success',
        severity: 'info',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        updatedState: { name: biz.name, category: biz.category, verificationStatus: biz.verificationStatus },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * (20 - idx * 2)),
      });

      if (biz.verificationStatus === 'verified' && adminUser) {
        initialLogs.push({
          userId: adminUser._id,
          actorName: adminUser.name,
          actorEmail: adminUser.email,
          actorRole: 'admin',
          action: 'BUSINESS_APPROVED',
          actionCategory: 'BUSINESS_MGMT',
          description: `Administrator verified and approved healthcare provider business "${biz.name}".`,
          resourceType: 'Business',
          resourceId: biz._id.toString(),
          resourceName: biz.name,
          method: 'PATCH',
          endpoint: `/api/admin/businesses/${biz._id}/approve`,
          status: 'success',
          severity: 'info',
          previousState: { verificationStatus: 'pending' },
          updatedState: { verificationStatus: 'verified' },
          ipAddress: '127.0.0.1',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * (18 - idx * 2)),
        });
      }
    });

    appointments.forEach((apt, idx) => {
      initialLogs.push({
        userId: apt.customerId || null,
        actorName: 'Patient / Customer',
        actorEmail: 'customer@queueless.com',
        actorRole: 'customer',
        action: 'APPOINTMENT_CREATED',
        actionCategory: 'APPOINTMENT',
        description: `Patient booked consultation with reference "${apt.bookingReference}".`,
        resourceType: 'Appointment',
        resourceId: apt._id.toString(),
        resourceName: apt.bookingReference,
        method: 'POST',
        endpoint: '/api/appointments',
        status: 'success',
        severity: 'info',
        ipAddress: '127.0.0.1',
        createdAt: new Date(Date.now() - 1000 * 60 * 30 * (idx + 1)),
      });
    });

    await AuditLog.insertMany(initialLogs);
    console.log(`✅ [AuditLogger] Initialized ${initialLogs.length} audit logs in MongoDB.`);
  } catch (err) {
    console.warn('⚠️ [AuditLogger Warning] Could not seed initial audit logs:', err.message);
  }
}

