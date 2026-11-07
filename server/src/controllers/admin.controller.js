import mongoose from 'mongoose';
import Appointment from '../models/appointment.model.js';
import User from '../models/user.model.js';
import Business from '../models/business.model.js';
import Staff from '../models/staff.model.js';
import Service from '../models/service.model.js';
import AuditLog from '../models/auditLog.model.js';
import { logAuditEvent, seedAuditLogsIfEmpty } from '../utils/auditLogger.js';

/**
 * Retrieve live platform-wide KPI statistics
 * Protected: GET /api/admin/stats (Role: admin)
 */
export const getAdminStats = async (req, res, next) => {
  try {
    const [
      totalAppointments,
      pendingAppointments,
      approvedAppointments,
      completedAppointments,
      cancelledAppointments,
      totalUsers,
      totalBusinesses,
    ] = await Promise.all([
      Appointment.countDocuments(),
      Appointment.countDocuments({ status: 'pending' }),
      Appointment.countDocuments({ status: { $in: ['confirmed', 'approved'] } }),
      Appointment.countDocuments({ status: 'completed' }),
      Appointment.countDocuments({ status: 'cancelled' }),
      User.countDocuments({ role: { $in: ['customer', 'user'] } }),
      Business.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalAppointments,
        pendingAppointments,
        approvedAppointments,
        completedAppointments,
        cancelledAppointments,
        totalUsers,
        totalBusinesses,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve all platform appointments with optional filters
 * Protected: GET /api/admin/appointments (Role: admin)
 */
export const getAllAppointments = async (req, res, next) => {
  try {
    const { status, search, date } = req.query;

    const query = {};

    if (status && status !== 'all') {
      if (status === 'approved' || status === 'confirmed') {
        query.status = { $in: ['confirmed', 'approved'] };
      } else {
        query.status = status;
      }
    }

    if (date) {
      query.appointmentDate = date;
    }

    if (search && search.trim()) {
      const term = search.trim();
      const regex = new RegExp(term, 'i');

      // Search by tokenNumber, bookingReference, notes
      const matchedUsers = await User.find({
        $or: [{ name: regex }, { email: regex }, { phone: regex }],
      }).select('_id');

      const userIds = matchedUsers.map((u) => u._id);

      query.$or = [
        { bookingReference: regex },
        { tokenNumber: regex },
        { notes: regex },
        { customerId: { $in: userIds } },
      ];
    }

    const appointments = await Appointment.find(query)
      .sort({ appointmentDate: -1, startTime: -1 })
      .populate('customerId', 'name email phone role')
      .populate('businessId', 'name category address contactPhone')
      .populate('serviceId', 'name durationMinutes price')
      .populate('staffId', 'title');

    return res.status(200).json({
      success: true,
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an appointment's status (Approve, Reject, Complete, Cancel)
 * Protected: PATCH /api/admin/appointments/:id/status (Role: admin)
 */
export const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason = '' } = req.body;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid appointment ID format', statusCode: 400 },
      });
    }

    const validStatuses = ['pending', 'confirmed', 'approved', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Invalid status. Allowed values are: ${validStatuses.join(', ')}`,
          statusCode: 400,
        },
      });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Appointment not found', statusCode: 404 },
      });
    }

    // Standardize 'approved' to 'confirmed' for schedule integrity or keep approved
    const previousStatus = appointment.status;
    const targetStatus = status === 'approved' ? 'confirmed' : status;
    appointment.status = targetStatus;

    if (targetStatus === 'cancelled') {
      appointment.cancellationReason = reason || 'Cancelled / Rejected by Administrator';
      appointment.cancelledAt = new Date();
      appointment.cancelledBy = req.user._id;
    } else {
      // If approved or completed from cancelled state, clear cancellation flag
      appointment.cancellationReason = null;
      appointment.cancelledAt = null;
      appointment.cancelledBy = null;
    }

    await appointment.save();

    let actionName = 'APPOINTMENT_UPDATED';
    if (targetStatus === 'confirmed') actionName = 'APPOINTMENT_APPROVED';
    else if (targetStatus === 'cancelled') actionName = 'APPOINTMENT_CANCELLED';
    else if (targetStatus === 'completed') actionName = 'APPOINTMENT_COMPLETED';

    await logAuditEvent({
      req,
      action: actionName,
      actionCategory: 'APPOINTMENT',
      description: `Administrator updated appointment "${appointment.bookingReference}" to status "${targetStatus}".`,
      resourceType: 'Appointment',
      resourceId: appointment._id,
      resourceName: appointment.bookingReference,
      status: 'success',
      severity: targetStatus === 'cancelled' ? 'warning' : 'info',
      previousState: { status: previousStatus },
      updatedState: { status: targetStatus, reason: appointment.cancellationReason },
    });

    const populated = await Appointment.findById(appointment._id)
      .populate('customerId', 'name email phone')
      .populate('businessId', 'name category address contactPhone')
      .populate('serviceId', 'name durationMinutes price');

    return res.status(200).json({
      success: true,
      message: `Appointment ${appointment.bookingReference} status updated to ${targetStatus}`,
      appointment: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve an appointment
 * Protected: PATCH /api/admin/appointments/:id/approve (Role: admin)
 */
export const approveAppointment = async (req, res, next) => {
  req.body = { ...req.body, status: 'confirmed' };
  return updateAppointmentStatus(req, res, next);
};

/**
 * Reject / Cancel an appointment
 * Protected: PATCH /api/admin/appointments/:id/reject (Role: admin)
 */
export const rejectAppointment = async (req, res, next) => {
  req.body = {
    ...req.body,
    status: 'cancelled',
    reason: req.body?.reason || 'Rejected by Administrator',
  };
  return updateAppointmentStatus(req, res, next);
};

/**
 * Mark an appointment as completed
 * Protected: PATCH /api/admin/appointments/:id/complete (Role: admin)
 */
export const completeAppointment = async (req, res, next) => {
  req.body = { ...req.body, status: 'completed' };
  return updateAppointmentStatus(req, res, next);
};

// ============================================================================
//                       ADMIN USER DIRECTORY CONTROLLER
// ============================================================================

/**
 * Retrieve paginated user directory with live MongoDB KPI metrics and filters
 * Protected: GET /api/admin/users (Role: admin)
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const { search, role, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const query = {};

    // Search by name, email, or phone (strictly enforce primitive string)
    if (typeof search === 'string' && search.trim()) {
      const cleanSearch = search.trim();
      query.$or = [
        { name: { $regex: cleanSearch, $options: 'i' } },
        { email: { $regex: cleanSearch, $options: 'i' } },
        { phone: { $regex: cleanSearch, $options: 'i' } },
      ];
    }

    // Role filtering (strictly enforce primitive string)
    if (typeof role === 'string' && role !== 'all') {
      const cleanRole = role.toLowerCase().trim();
      if (cleanRole === 'customer') {
        query.role = { $in: ['customer', 'user'] };
      } else {
        query.role = cleanRole;
      }
    }

    // Status filtering (strictly enforce primitive string)
    if (typeof status === 'string' && status !== 'all') {
      const cleanStatus = status.toLowerCase().trim();
      if (cleanStatus === 'active') {
        query.isActive = true;
      } else if (cleanStatus === 'blocked' || cleanStatus === 'inactive') {
        query.isActive = false;
      }
    }

    // Sort configuration
    const allowedSortFields = ['createdAt', 'name', 'email', 'role', 'isActive', 'lastLogin'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortDirection };

    // Live MongoDB KPI metrics (Total, Customer, Provider, Staff, Active, Blocked)
    const [
      totalUsers,
      totalCustomers,
      totalProviders,
      totalStaff,
      activeUsers,
      blockedUsers,
      matchingCount,
      users,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: { $in: ['customer', 'user'] } }),
      User.countDocuments({ role: 'provider' }),
      User.countDocuments({ role: 'staff' }),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: false }),
      User.countDocuments(query),
      User.find(query)
        .select('-passwordHash')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Enrich users with business affiliations
    const providerUserIds = users.filter((u) => u.role === 'provider').map((u) => u._id);
    const staffUserIds = users.filter((u) => u.role === 'staff').map((u) => u._id);

    const [ownedBusinesses, staffDocs] = await Promise.all([
      providerUserIds.length > 0
        ? Business.find({ ownerId: { $in: providerUserIds } }).select('_id ownerId name category')
        : [],
      staffUserIds.length > 0
        ? Staff.find({ userId: { $in: staffUserIds } })
            .populate('businessId', '_id name category')
            .select('_id userId title businessId')
        : [],
    ]);

    const businessByOwner = new Map();
    ownedBusinesses.forEach((b) => businessByOwner.set(b.ownerId.toString(), b));

    const staffByUser = new Map();
    staffDocs.forEach((s) => staffByUser.set(s.userId.toString(), s));

    const enrichedUsers = users.map((u) => {
      let businessInfo = null;
      if (u.role === 'provider') {
        const biz = businessByOwner.get(u._id.toString());
        if (biz) {
          businessInfo = {
            _id: biz._id,
            name: biz.name,
            category: biz.category,
            relation: 'Owner',
          };
        }
      } else if (u.role === 'staff') {
        const st = staffByUser.get(u._id.toString());
        if (st && st.businessId) {
          businessInfo = {
            _id: st.businessId._id,
            name: st.businessId.name,
            category: st.businessId.category,
            title: st.title,
            relation: 'Staff',
          };
        }
      }

      return {
        ...u,
        business: businessInfo,
      };
    });

    const totalPages = Math.ceil(matchingCount / limit) || 1;

    return res.status(200).json({
      success: true,
      kpis: {
        totalUsers,
        totalCustomers,
        totalProviders,
        totalStaff,
        activeUsers,
        blockedUsers,
      },
      pagination: {
        page,
        limit,
        totalUsers: matchingCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      users: enrichedUsers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve detailed profile of a single user
 * Protected: GET /api/admin/users/:id (Role: admin)
 */
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid user ID format', statusCode: 400 },
      });
    }

    const user = await User.findById(id).select('-passwordHash').lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found in system directory', statusCode: 404 },
      });
    }

    // Attach associated business and appointment activity
    let businessInfo = null;
    let appointmentStats = { total: 0, completed: 0, cancelled: 0 };

    if (user.role === 'provider') {
      const biz = await Business.findOne({ ownerId: user._id });
      if (biz) {
        businessInfo = {
          _id: biz._id,
          name: biz.name,
          category: biz.category,
          address: biz.address,
          contactPhone: biz.contactPhone,
          contactEmail: biz.contactEmail,
          isActive: biz.isActive,
          isBookingsOpen: biz.isBookingsOpen,
          relation: 'Owner',
        };
        const [total, completed, cancelled] = await Promise.all([
          Appointment.countDocuments({ businessId: biz._id }),
          Appointment.countDocuments({ businessId: biz._id, status: 'completed' }),
          Appointment.countDocuments({ businessId: biz._id, status: 'cancelled' }),
        ]);
        appointmentStats = { total, completed, cancelled };
      }
    } else if (user.role === 'staff') {
      const staff = await Staff.findOne({ userId: user._id }).populate('businessId');
      if (staff && staff.businessId) {
        businessInfo = {
          _id: staff.businessId._id,
          name: staff.businessId.name,
          category: staff.businessId.category,
          title: staff.title,
          workingDays: staff.workingDays,
          workingHours: staff.workingHours,
          relation: 'Staff Member',
        };
        const [total, completed, cancelled] = await Promise.all([
          Appointment.countDocuments({ staffId: staff._id }),
          Appointment.countDocuments({ staffId: staff._id, status: 'completed' }),
          Appointment.countDocuments({ staffId: staff._id, status: 'cancelled' }),
        ]);
        appointmentStats = { total, completed, cancelled };
      }
    } else {
      const [total, completed, cancelled] = await Promise.all([
        Appointment.countDocuments({ customerId: user._id }),
        Appointment.countDocuments({ customerId: user._id, status: 'completed' }),
        Appointment.countDocuments({ customerId: user._id, status: 'cancelled' }),
      ]);
      appointmentStats = { total, completed, cancelled };
    }

    return res.status(200).json({
      success: true,
      user: {
        ...user,
        business: businessInfo,
        appointmentStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle user active/blocked status
 * Protected: PATCH /api/admin/users/:id/status (Role: admin)
 */
export const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid user ID format', statusCode: 400 },
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found in system directory', statusCode: 404 },
      });
    }

    // Resolve boolean status from request body
    let newActiveState;
    if (typeof req.body.isActive === 'boolean') {
      newActiveState = req.body.isActive;
    } else if (typeof req.body.status === 'string') {
      const s = req.body.status.toLowerCase().trim();
      if (s === 'active' || s === 'unblock' || s === 'reactivate') {
        newActiveState = true;
      } else if (s === 'blocked' || s === 'block' || s === 'inactive' || s === 'deactivate') {
        newActiveState = false;
      }
    }

    if (typeof newActiveState !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Status must specify a valid boolean isActive or status ("active" | "blocked")',
          statusCode: 400,
        },
      });
    }

    // Security Safeguard 1: Administrator cannot block their own account
    if (user._id.toString() === req.user._id.toString() && !newActiveState) {
      await logAuditEvent({
        req,
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        actionCategory: 'SECURITY',
        description: `Security safeguard blocked administrator "${req.user.name}" from deactivating their own account.`,
        resourceType: 'User',
        resourceId: user._id,
        resourceName: user.name,
        status: 'blocked',
        severity: 'warning',
      });
      return res.status(400).json({
        success: false,
        error: {
          message: 'Security safeguard: Administrators cannot block or deactivate their own account.',
          statusCode: 400,
        },
      });
    }

    const previousActiveState = user.isActive;
    user.isActive = newActiveState;
    await user.save();

    await logAuditEvent({
      req,
      action: newActiveState ? 'USER_UNBLOCKED' : 'USER_BLOCKED',
      actionCategory: 'USER_MGMT',
      description: `Administrator ${newActiveState ? 'unblocked/activated' : 'blocked/deactivated'} user account "${user.name}".`,
      resourceType: 'User',
      resourceId: user._id,
      resourceName: user.name,
      status: 'success',
      severity: newActiveState ? 'info' : 'warning',
      previousState: { isActive: previousActiveState },
      updatedState: { isActive: newActiveState },
      metadata: { email: user.email, role: user.role },
    });

    const sanitized = await User.findById(user._id).select('-passwordHash');

    return res.status(200).json({
      success: true,
      message: `User account for "${user.name}" has been ${newActiveState ? 'activated' : 'blocked'} successfully.`,
      user: sanitized,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user role
 * Protected: PATCH /api/admin/users/:id/role (Role: admin)
 */
export const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid user ID format', statusCode: 400 },
      });
    }

    const { role } = req.body;
    const validRoles = ['customer', 'user', 'provider', 'staff', 'admin'];

    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Invalid role "${role}". Supported roles are: customer, provider, staff, admin`,
          statusCode: 400,
        },
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found in system directory', statusCode: 404 },
      });
    }

    // Security Safeguard: Administrator cannot downgrade their own admin role
    if (user._id.toString() === req.user._id.toString() && role !== 'admin') {
      await logAuditEvent({
        req,
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        actionCategory: 'SECURITY',
        description: `Security safeguard blocked administrator "${req.user.name}" from downgrading their own admin role.`,
        resourceType: 'User',
        resourceId: user._id,
        resourceName: user.name,
        status: 'blocked',
        severity: 'critical',
      });
      return res.status(400).json({
        success: false,
        error: {
          message: 'Security safeguard: Administrators cannot remove or downgrade their own administrative access.',
          statusCode: 400,
        },
      });
    }

    const previousRole = user.role;
    user.role = role;
    await user.save();

    await logAuditEvent({
      req,
      action: 'USER_ROLE_CHANGED',
      actionCategory: 'USER_MGMT',
      description: `Administrator changed user "${user.name}" role from "${previousRole}" to "${role}".`,
      resourceType: 'User',
      resourceId: user._id,
      resourceName: user.name,
      status: 'success',
      severity: 'critical',
      previousState: { role: previousRole },
      updatedState: { role },
      metadata: { email: user.email },
    });

    const sanitized = await User.findById(user._id).select('-passwordHash');

    return res.status(200).json({
      success: true,
      message: `User role for "${user.name}" updated to "${role}" successfully.`,
      user: sanitized,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
//                   ADMIN BUSINESS DIRECTORY CONTROLLER
// ============================================================================

/**
 * Retrieve paginated business directory with live MongoDB KPI metrics and filters
 * Protected: GET /api/admin/businesses (Role: admin)
 */
export const getAllBusinesses = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const {
      search,
      verificationStatus,
      status,
      category,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = {};

    // Search by business name, contactEmail, contactPhone, or owner name/email
    if (search && search.trim()) {
      const cleanSearch = search.trim();
      const regex = new RegExp(cleanSearch, 'i');

      const matchedUsers = await User.find({
        $or: [{ name: regex }, { email: regex }],
      }).select('_id');
      const userIds = matchedUsers.map((u) => u._id);

      query.$or = [
        { name: regex },
        { contactEmail: regex },
        { contactPhone: regex },
        { ownerId: { $in: userIds } },
      ];
    }

    // Filter by verification status (pending, verified, rejected)
    if (verificationStatus && verificationStatus !== 'all') {
      const v = verificationStatus.toLowerCase().trim();
      if (v === 'approved') {
        query.verificationStatus = 'verified';
      } else if (['pending', 'verified', 'rejected'].includes(v)) {
        query.verificationStatus = v;
      }
    }

    // Filter by active / suspended status
    if (status && status !== 'all') {
      const s = status.toLowerCase().trim();
      if (s === 'active') {
        query.isActive = true;
      } else if (s === 'suspended' || s === 'inactive') {
        query.isActive = false;
      }
    }

    // Filter by business category
    if (category && category !== 'all') {
      query.category = category.toLowerCase().trim();
    }

    // Sort configuration
    const allowedSortFields = ['createdAt', 'name', 'category', 'verificationStatus', 'isActive'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortDirection };

    // Live MongoDB KPI metrics (Total, Approved, Pending, Rejected, Active, Suspended)
    const [
      totalBusinesses,
      approvedBusinesses,
      pendingVerification,
      rejectedBusinesses,
      activeBusinesses,
      suspendedBusinesses,
      matchingCount,
      businesses,
    ] = await Promise.all([
      Business.countDocuments(),
      Business.countDocuments({ verificationStatus: 'verified' }),
      Business.countDocuments({ verificationStatus: 'pending' }),
      Business.countDocuments({ verificationStatus: 'rejected' }),
      Business.countDocuments({ isActive: true }),
      Business.countDocuments({ isActive: false }),
      Business.countDocuments(query),
      Business.find(query)
        .populate('ownerId', 'name email phone role')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Batch aggregate service and appointment counts efficiently
    const businessIds = businesses.map((b) => b._id);
    const [serviceCounts, appointmentCounts] = await Promise.all([
      businessIds.length > 0
        ? Service.aggregate([
            { $match: { businessId: { $in: businessIds } } },
            { $group: { _id: '$businessId', count: { $sum: 1 } } },
          ])
        : [],
      businessIds.length > 0
        ? Appointment.aggregate([
            { $match: { businessId: { $in: businessIds } } },
            { $group: { _id: '$businessId', count: { $sum: 1 } } },
          ])
        : [],
    ]);

    const serviceCountMap = new Map();
    serviceCounts.forEach((sc) => serviceCountMap.set(sc._id.toString(), sc.count));

    const appointmentCountMap = new Map();
    appointmentCounts.forEach((ac) => appointmentCountMap.set(ac._id.toString(), ac.count));

    const enrichedBusinesses = businesses.map((b) => ({
      ...b,
      owner: b.ownerId || null,
      totalServices: serviceCountMap.get(b._id.toString()) || 0,
      totalAppointments: appointmentCountMap.get(b._id.toString()) || 0,
    }));

    const totalPages = Math.ceil(matchingCount / limit) || 1;

    return res.status(200).json({
      success: true,
      kpis: {
        totalBusinesses,
        approvedBusinesses,
        pendingVerification,
        rejectedBusinesses,
        activeBusinesses,
        suspendedBusinesses,
      },
      pagination: {
        page,
        limit,
        totalBusinesses: matchingCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      businesses: enrichedBusinesses,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve detailed profile of a single business
 * Protected: GET /api/admin/businesses/:id (Role: admin)
 */
export const getBusinessById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid business ID format', statusCode: 400 },
      });
    }

    const business = await Business.findById(id)
      .populate('ownerId', 'name email phone role createdAt')
      .lean();

    if (!business) {
      return res.status(404).json({
        success: false,
        error: { message: 'Business not found in system directory', statusCode: 404 },
      });
    }

    const [services, staff, total, completed, cancelled, inQueue, confirmed, pending] =
      await Promise.all([
        Service.find({ businessId: business._id }).sort({ name: 1 }).lean(),
        Staff.find({ businessId: business._id })
          .populate('userId', 'name email phone')
          .sort({ createdAt: -1 })
          .lean(),
        Appointment.countDocuments({ businessId: business._id }),
        Appointment.countDocuments({ businessId: business._id, status: 'completed' }),
        Appointment.countDocuments({ businessId: business._id, status: 'cancelled' }),
        Appointment.countDocuments({ businessId: business._id, status: 'in_progress' }),
        Appointment.countDocuments({ businessId: business._id, status: 'confirmed' }),
        Appointment.countDocuments({ businessId: business._id, status: 'pending' }),
      ]);

    return res.status(200).json({
      success: true,
      business: {
        ...business,
        owner: business.ownerId || null,
        services,
        staff,
        appointmentStats: {
          total,
          completed,
          cancelled,
          inQueue,
          confirmed,
          pending,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve and verify a business
 * Protected: PATCH /api/admin/businesses/:id/approve (Role: admin)
 */
export const approveBusiness = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid business ID format', statusCode: 400 },
      });
    }

    const business = await Business.findById(id);
    if (!business) {
      return res.status(404).json({
        success: false,
        error: { message: 'Business not found in system directory', statusCode: 404 },
      });
    }

    // Security Safeguard: Business owner cannot self-approve their own business
    if (business.ownerId && business.ownerId.toString() === req.user._id.toString()) {
      await logAuditEvent({
        req,
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        actionCategory: 'SECURITY',
        description: `Security safeguard blocked business owner "${req.user.name}" from self-approving business "${business.name}".`,
        resourceType: 'Business',
        resourceId: business._id,
        resourceName: business.name,
        status: 'blocked',
        severity: 'warning',
      });
      return res.status(400).json({
        success: false,
        error: {
          message: 'Security safeguard: Business owners cannot approve their own businesses.',
          statusCode: 400,
        },
      });
    }

    const previousVerification = business.verificationStatus;
    business.verificationStatus = 'verified';
    business.rejectionReason = '';
    await business.save();

    await logAuditEvent({
      req,
      action: 'BUSINESS_APPROVED',
      actionCategory: 'BUSINESS_MGMT',
      description: `Administrator approved and verified healthcare business "${business.name}".`,
      resourceType: 'Business',
      resourceId: business._id,
      resourceName: business.name,
      status: 'success',
      severity: 'info',
      previousState: { verificationStatus: previousVerification },
      updatedState: { verificationStatus: 'verified' },
    });

    const populated = await Business.findById(business._id).populate('ownerId', 'name email phone role');

    return res.status(200).json({
      success: true,
      message: `Business "${business.name}" has been approved and verified successfully.`,
      business: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject a business with a mandatory reason
 * Protected: PATCH /api/admin/businesses/:id/reject (Role: admin)
 */
export const rejectBusiness = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid business ID format', statusCode: 400 },
      });
    }

    const { reason } = req.body;
    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Rejection reason is required and must be at least 3 characters.',
          statusCode: 400,
        },
      });
    }

    const business = await Business.findById(id);
    if (!business) {
      return res.status(404).json({
        success: false,
        error: { message: 'Business not found in system directory', statusCode: 404 },
      });
    }

    const previousVerification = business.verificationStatus;
    business.verificationStatus = 'rejected';
    business.rejectionReason = reason.trim();
    await business.save();

    await logAuditEvent({
      req,
      action: 'BUSINESS_REJECTED',
      actionCategory: 'BUSINESS_MGMT',
      description: `Administrator rejected business verification for "${business.name}". Reason: ${reason.trim()}`,
      resourceType: 'Business',
      resourceId: business._id,
      resourceName: business.name,
      status: 'success',
      severity: 'warning',
      previousState: { verificationStatus: previousVerification },
      updatedState: { verificationStatus: 'rejected', rejectionReason: reason.trim() },
    });

    const populated = await Business.findById(business._id).populate('ownerId', 'name email phone role');

    return res.status(200).json({
      success: true,
      message: `Business "${business.name}" has been rejected.`,
      business: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update business active/suspended status with optional/mandatory reason
 * Protected: PATCH /api/admin/businesses/:id/status (Role: admin)
 */
export const updateBusinessStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid business ID format', statusCode: 400 },
      });
    }

    const business = await Business.findById(id);
    if (!business) {
      return res.status(404).json({
        success: false,
        error: { message: 'Business not found in system directory', statusCode: 404 },
      });
    }

    let newActiveState;
    if (typeof req.body.isActive === 'boolean') {
      newActiveState = req.body.isActive;
    } else if (typeof req.body.status === 'string') {
      const s = req.body.status.toLowerCase().trim();
      if (s === 'active' || s === 'activate' || s === 'reactivate' || s === 'unsuspend') {
        newActiveState = true;
      } else if (s === 'suspended' || s === 'suspend' || s === 'inactive' || s === 'deactivate') {
        newActiveState = false;
      }
    }

    if (typeof newActiveState !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Status must specify a valid boolean isActive or status ("active" | "suspended")',
          statusCode: 400,
        },
      });
    }

    const reason = req.body.reason && typeof req.body.reason === 'string' ? req.body.reason.trim() : '';

    const previousActive = business.isActive;
    if (!newActiveState) {
      business.isActive = false;
      business.suspensionReason = reason || business.suspensionReason || 'Suspended by administrator';
    } else {
      business.isActive = true;
      business.suspensionReason = '';
    }

    await business.save();

    await logAuditEvent({
      req,
      action: newActiveState ? 'BUSINESS_REACTIVATED' : 'BUSINESS_SUSPENDED',
      actionCategory: 'BUSINESS_MGMT',
      description: `Administrator ${newActiveState ? 'reactivated' : 'suspended'} business "${business.name}".`,
      resourceType: 'Business',
      resourceId: business._id,
      resourceName: business.name,
      status: 'success',
      severity: newActiveState ? 'info' : 'critical',
      previousState: { isActive: previousActive },
      updatedState: { isActive: newActiveState, suspensionReason: business.suspensionReason },
    });

    const populated = await Business.findById(business._id).populate('ownerId', 'name email phone role');

    return res.status(200).json({
      success: true,
      message: `Business "${business.name}" has been ${newActiveState ? 'reactivated' : 'suspended'} successfully.`,
      business: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Convenience alias for suspending business
 * Protected: PATCH /api/admin/businesses/:id/suspend (Role: admin)
 */
export const suspendBusiness = async (req, res, next) => {
  req.body = { ...req.body, isActive: false };
  return updateBusinessStatus(req, res, next);
};

/**
 * Convenience alias for reactivating business
 * Protected: PATCH /api/admin/businesses/:id/reactivate (Role: admin)
 */
export const reactivateBusiness = async (req, res, next) => {
  req.body = { ...req.body, isActive: true };
  return updateBusinessStatus(req, res, next);
};

// ============================================================================
//                   ADMIN SECURITY & ACTIVITY AUDIT LOGS
// ============================================================================

/**
 * Retrieve paginated audit logs with live KPIs and multi-criteria filters
 * Protected: GET /api/admin/logs (Role: admin)
 */
export const getAllAuditLogs = async (req, res, next) => {
  try {
    // Seed initial audit trail if empty
    await seedAuditLogsIfEmpty();

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 15));
    const skip = (page - 1) * limit;

    const {
      search,
      category,
      actionCategory,
      severity,
      status,
      role,
      actorRole,
      resourceType,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = {};

    // Search across actor name, email, description, resource name, action, and IP
    if (search && search.trim()) {
      const clean = search.trim();
      const regex = new RegExp(clean, 'i');
      query.$or = [
        { actorName: regex },
        { actorEmail: regex },
        { description: regex },
        { resourceName: regex },
        { action: regex },
        { ipAddress: regex },
      ];
    }

    // Category Filter (supports ?category= or ?actionCategory=)
    const effectiveCategory = category || actionCategory;
    if (effectiveCategory && effectiveCategory !== 'all') {
      query.actionCategory = effectiveCategory.toUpperCase().trim();
    }

    // Severity Filter
    if (severity && severity !== 'all') {
      query.severity = severity.toLowerCase().trim();
    }

    // Status Filter
    if (status && status !== 'all') {
      query.status = status.toLowerCase().trim();
    }

    // Actor Role Filter (supports ?role= or ?actorRole=)
    const effectiveRole = role || actorRole;
    if (effectiveRole && effectiveRole !== 'all') {
      query.actorRole = effectiveRole.toLowerCase().trim();
    }

    // Resource Type Filter
    if (resourceType && resourceType !== 'all') {
      query.resourceType = resourceType.trim();
    }

    // Date Range Filter
    if (startDate && endDate) {
      const start = new Date(`${startDate}T00:00:00.000Z`);
      const end = new Date(`${endDate}T23:59:59.999Z`);
      if (start <= end) {
        query.createdAt = { $gte: start, $lte: end };
      } else {
        query.createdAt = { $gte: end, $lte: start };
      }
    } else if (startDate) {
      query.createdAt = { $gte: new Date(`${startDate}T00:00:00.000Z`) };
    } else if (endDate) {
      query.createdAt = { $lte: new Date(`${endDate}T23:59:59.999Z`) };
    }

    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const allowedSorts = ['createdAt', 'action', 'actorName', 'severity', 'status'];
    const sortField = allowedSorts.includes(sortBy) ? sortBy : 'createdAt';
    const sort = { [sortField]: sortDirection };

    // Today midnight anchor
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalLogs,
      todayEvents,
      adminActions,
      securityEvents,
      failedActions,
      uniqueAdmins,
      matchingCount,
      logs,
    ] = await Promise.all([
      AuditLog.countDocuments(),
      AuditLog.countDocuments({ createdAt: { $gte: today } }),
      AuditLog.countDocuments({ actorRole: 'admin' }),
      AuditLog.countDocuments({
        $or: [{ actionCategory: 'SECURITY' }, { actionCategory: 'AUTH' }, { severity: 'critical' }],
      }),
      AuditLog.countDocuments({ status: { $in: ['failure', 'blocked'] } }),
      AuditLog.distinct('userId', { actorRole: 'admin', userId: { $ne: null } }),
      AuditLog.countDocuments(query),
      AuditLog.find(query).sort(sort).skip(skip).limit(limit).lean(),
    ]);

    const totalPages = Math.ceil(matchingCount / limit) || 1;

    return res.status(200).json({
      success: true,
      kpis: {
        totalLogs,
        todayEvents,
        adminActions,
        securityEvents,
        failedActions,
        uniqueAdmins: uniqueAdmins.length,
      },
      pagination: {
        page,
        limit,
        totalLogs: matchingCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      logs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve individual audit event details
 * Protected: GET /api/admin/logs/:id (Role: admin)
 */
export const getAdminLogById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid audit log ID format', statusCode: 400 },
      });
    }

    const log = await AuditLog.findById(id).lean();
    if (!log) {
      return res.status(404).json({
        success: false,
        error: { message: 'Audit event record not found', statusCode: 404 },
      });
    }

    return res.status(200).json({
      success: true,
      log,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve live audit log KPI statistics
 * Protected: GET /api/admin/logs/stats (Role: admin)
 */
export const getAdminLogStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalLogs,
      todayEvents,
      adminActions,
      securityEvents,
      failedActions,
      uniqueAdmins,
    ] = await Promise.all([
      AuditLog.countDocuments(),
      AuditLog.countDocuments({ createdAt: { $gte: today } }),
      AuditLog.countDocuments({ actorRole: 'admin' }),
      AuditLog.countDocuments({
        $or: [{ actionCategory: 'SECURITY' }, { actionCategory: 'AUTH' }, { severity: 'critical' }],
      }),
      AuditLog.countDocuments({ status: { $in: ['failure', 'blocked'] } }),
      AuditLog.distinct('userId', { actorRole: 'admin', userId: { $ne: null } }),
    ]);

    const statsPayload = {
      totalLogs,
      todayEvents,
      adminActions,
      securityEvents,
      failedActions,
      uniqueAdmins: uniqueAdmins.length,
    };

    return res.status(200).json({
      success: true,
      kpis: statsPayload,
      stats: statsPayload,
    });
  } catch (error) {
    next(error);
  }
};



