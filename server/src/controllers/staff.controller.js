import Staff from '../models/staff.model.js';
import Business from '../models/business.model.js';
import User from '../models/user.model.js';
import Appointment from '../models/appointment.model.js';
import WorkingHours from '../models/workingHours.model.js';
import QueueEntry from '../models/queueEntry.model.js';

/**
 * Helper to verify that the logged-in user owns the business
 */
export const verifyBusinessOwnership = async (businessId, userId, userRole) => {
  if (userRole === 'admin') return true;
  const business = await Business.findById(businessId);
  if (!business) return null;
  return business.ownerId.toString() === userId.toString();
};

/**
 * Add / Invite a staff member to a business
 * Protected: POST /api/staff (Role: provider, admin)
 */
export const addStaff = async (req, res, next) => {
  try {
    let {
      businessId,
      email,
      name,
      phone = '',
      title = 'Staff Member',
      serviceIds = [],
      workingDays = [1, 2, 3, 4, 5],
      workingHours = { start: '09:00', end: '17:00' },
      temporaryPassword,
    } = req.body;

    // Default to provider's owned business if not explicitly provided
    if (!businessId) {
      const ownedBiz = await Business.findOne({ ownerId: req.user._id, isActive: true });
      if (!ownedBiz) {
        return res.status(404).json({
          success: false,
          error: { message: 'No registered business found for your provider account', statusCode: 404 },
        });
      }
      businessId = ownedBiz._id;
    }

    const isOwner = await verifyBusinessOwnership(businessId, req.user._id, req.user.role);
    if (isOwner === null) {
      return res.status(404).json({
        success: false,
        error: { message: 'Business not found', statusCode: 404 },
      });
    }
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied: You are not authorized to manage staff for this business.',
          statusCode: 403,
        },
      });
    }

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        error: { message: 'Staff name and email address are required', statusCode: 400 },
      });
    }

    // Check if user with this email already exists
    let staffUser = await User.findOne({ email: email.toLowerCase().trim() });

    if (!staffUser) {
      // Create user account with role: 'staff' (cannot assign provider or admin role to staff)
      staffUser = new User({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        passwordHash: temporaryPassword || 'QueueLessStaff123!',
        role: 'staff',
        isActive: true,
      });
      await staffUser.save();
    } else {
      if (phone && !staffUser.phone) {
        staffUser.phone = phone.trim();
        await staffUser.save();
      }
      // If user exists as a customer, elevate to staff
      if (staffUser.role === 'customer' || staffUser.role === 'user') {
        staffUser.role = 'staff';
        await staffUser.save();
      }
    }

    // Check if staff record exists for this business
    let staffRecord = await Staff.findOne({ businessId, userId: staffUser._id });

    if (staffRecord) {
      if (staffRecord.isActive) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'This user is already an active staff member in your business.',
            statusCode: 409,
          },
        });
      }
      // Re-activate previously deactivated staff
      staffRecord.isActive = true;
      staffRecord.name = name.trim();
      staffRecord.email = email.toLowerCase().trim();
      staffRecord.phone = phone.trim();
      staffRecord.title = title || staffRecord.title;
      staffRecord.serviceIds = serviceIds || staffRecord.serviceIds;
      staffRecord.workingDays = workingDays || staffRecord.workingDays;
      staffRecord.workingHours = workingHours || staffRecord.workingHours;
      await staffRecord.save();
    } else {
      // Create new Staff entry
      staffRecord = new Staff({
        businessId,
        userId: staffUser._id,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        title: title || 'Staff Member',
        serviceIds: serviceIds || [],
        workingDays: workingDays || [1, 2, 3, 4, 5],
        workingHours: workingHours || { start: '09:00', end: '17:00' },
        isActive: true,
      });
      await staffRecord.save();
    }

    const populatedStaff = await Staff.findById(staffRecord._id)
      .populate('userId', 'name email phone role')
      .populate('serviceIds', 'name durationMinutes price');

    return res.status(201).json({
      success: true,
      message: 'Staff member added successfully',
      staff: populatedStaff,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all staff members belonging to the authenticated provider's business
 * Protected: GET /api/staff/my (Role: provider, admin)
 */
export const getMyStaff = async (req, res, next) => {
  try {
    const business = await Business.findOne({ ownerId: req.user._id, isActive: true });
    if (!business) {
      return res.status(404).json({
        success: false,
        error: { message: 'No registered business found for your account', statusCode: 404 },
      });
    }

    const { includeInactive } = req.query;
    const query = { businessId: business._id };
    if (includeInactive !== 'true') {
      // Return both by default for provider dashboard, but can be filtered
    }

    const staffList = await Staff.find(query)
      .sort({ createdAt: -1 })
      .populate('userId', 'name email phone avatarUrl role')
      .populate('serviceIds', 'name durationMinutes price');

    return res.status(200).json({
      success: true,
      businessId: business._id,
      businessName: business.name,
      count: staffList.length,
      staff: staffList,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all active staff members for a specific business (public / booking flow)
 * Public / Protected: GET /api/staff?businessId=...
 */
export const getStaffByBusiness = async (req, res, next) => {
  try {
    const { businessId, includeInactive } = req.query;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        error: { message: 'businessId query parameter is required', statusCode: 400 },
      });
    }

    const query = { businessId };
    if (includeInactive !== 'true') {
      query.isActive = true;
    }

    const staffList = await Staff.find(query)
      .populate('userId', 'name email phone avatarUrl')
      .populate('serviceIds', 'name durationMinutes price');

    return res.status(200).json({
      success: true,
      count: staffList.length,
      staff: staffList,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update staff details (title, services, hours, phone, name)
 * Protected: PATCH /api/staff/:id (Role: provider, admin)
 */
export const updateStaff = async (req, res, next) => {
  try {
    const { id } = req.params;

    const staffRecord = await Staff.findById(id);
    if (!staffRecord) {
      return res.status(404).json({
        success: false,
        error: { message: 'Staff member not found', statusCode: 404 },
      });
    }

    // Security: Verify Provider A cannot update Provider B's staff
    const isOwner = await verifyBusinessOwnership(staffRecord.businessId, req.user._id, req.user.role);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied: You are not authorized to update staff for another provider\'s business.',
          statusCode: 403,
        },
      });
    }

    const { name, phone, title, serviceIds, workingDays, workingHours, isActive } = req.body;

    if (name !== undefined) staffRecord.name = name;
    if (phone !== undefined) staffRecord.phone = phone;
    if (title !== undefined) staffRecord.title = title;
    if (serviceIds !== undefined) staffRecord.serviceIds = serviceIds;
    if (workingDays !== undefined) staffRecord.workingDays = workingDays;
    if (workingHours !== undefined) staffRecord.workingHours = workingHours;
    if (isActive !== undefined) staffRecord.isActive = isActive;

    await staffRecord.save();

    // If name or phone updated, also update linked User
    if (staffRecord.userId && (name || phone)) {
      await User.findByIdAndUpdate(staffRecord.userId, {
        ...(name ? { name } : {}),
        ...(phone ? { phone } : {}),
      });
    }

    const updated = await Staff.findById(id)
      .populate('userId', 'name email phone role')
      .populate('serviceIds', 'name durationMinutes price');

    return res.status(200).json({
      success: true,
      message: 'Staff details updated successfully',
      staff: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle staff active / deactivated status
 * Protected: PATCH /api/staff/:id/toggle-status (Role: provider, admin)
 */
export const toggleStaffStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const staffRecord = await Staff.findById(id);
    if (!staffRecord) {
      return res.status(404).json({
        success: false,
        error: { message: 'Staff member not found', statusCode: 404 },
      });
    }

    const isOwner = await verifyBusinessOwnership(staffRecord.businessId, req.user._id, req.user.role);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied: You are not authorized to modify staff for this business.',
          statusCode: 403,
        },
      });
    }

    staffRecord.isActive = !staffRecord.isActive;
    await staffRecord.save();

    return res.status(200).json({
      success: true,
      message: `Staff member ${staffRecord.isActive ? 'activated' : 'deactivated'} successfully`,
      staff: staffRecord,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deactivate a staff member (Soft delete)
 * Protected: DELETE /api/staff/:id (Role: provider, admin)
 */
export const removeStaff = async (req, res, next) => {
  try {
    const { id } = req.params;

    const staffRecord = await Staff.findById(id);
    if (!staffRecord) {
      return res.status(404).json({
        success: false,
        error: { message: 'Staff member not found', statusCode: 404 },
      });
    }

    // Security: Check ownership
    const isOwner = await verifyBusinessOwnership(staffRecord.businessId, req.user._id, req.user.role);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied: You are not authorized to remove staff from another provider\'s business.',
          statusCode: 403,
        },
      });
    }

    staffRecord.isActive = false;
    await staffRecord.save();

    return res.status(200).json({
      success: true,
      message: 'Staff member deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve authenticated staff member's schedule, working hours, and assigned appointments
 * Protected: GET /api/staff/schedule (Role: staff, provider, admin)
 */
export const getStaffSchedule = async (req, res, next) => {
  try {
    let staffDoc = null;

    if (req.user.role === 'staff') {
      staffDoc = await Staff.findOne({ userId: req.user._id, isActive: true })
        .populate('userId', 'name email phone avatarUrl')
        .populate('serviceIds', 'name durationMinutes price');

      if (!staffDoc) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'No active staff profile found associated with your account.',
            statusCode: 404,
          },
        });
      }
    } else if (req.user.role === 'provider' || req.user.role === 'admin') {
      // Providers and admins can inspect a specific staff member's schedule
      if (req.query.staffId) {
        staffDoc = await Staff.findById(req.query.staffId)
          .populate('userId', 'name email phone avatarUrl')
          .populate('serviceIds', 'name durationMinutes price');
      } else {
        const ownedBiz = await Business.findOne({
          ownerId: req.user._id,
          isActive: true,
        });
        if (ownedBiz) {
          staffDoc = await Staff.findOne({ businessId: ownedBiz._id, isActive: true })
            .populate('userId', 'name email phone avatarUrl')
            .populate('serviceIds', 'name durationMinutes price');
        }
      }

      if (!staffDoc) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Staff profile not found for schedule lookup.',
            statusCode: 404,
          },
        });
      }

      if (req.user.role === 'provider') {
        const isOwner = await verifyBusinessOwnership(
          staffDoc.businessId,
          req.user._id,
          req.user.role
        );
        if (!isOwner) {
          return res.status(403).json({
            success: false,
            error: {
              message: 'Access denied: You are not authorized to view this staff member schedule.',
              statusCode: 403,
            },
          });
        }
      }
    } else {
      return res.status(403).json({
        success: false,
        error: { message: 'Unauthorized role for staff schedule access.', statusCode: 403 },
      });
    }

    const business = await Business.findById(staffDoc.businessId).select(
      'name category address contactPhone contactEmail operatingHours'
    );

    // Fetch individual day WorkingHours overrides if configured
    const detailedWorkingHours = await WorkingHours.find({
      businessId: staffDoc.businessId,
      staffId: staffDoc._id,
    }).sort({ dayOfWeek: 1 });

    // Parse filters from query
    const { date, startDate, endDate, status, view = 'assigned' } = req.query;

    const appointmentQuery = {
      businessId: staffDoc.businessId,
    };

    // Filter by staff assignment
    if (view === 'with_unassigned') {
      appointmentQuery.$or = [{ staffId: staffDoc._id }, { staffId: null }];
    } else if (view === 'all_business' && (req.user.role === 'provider' || req.user.role === 'admin')) {
      // Provider/admin view all appointments
    } else {
      // Default: strictly the staff member's own appointments
      appointmentQuery.staffId = staffDoc._id;
    }

    // Filter by date or date range
    if (date) {
      appointmentQuery.appointmentDate = date;
    } else if (startDate && endDate) {
      appointmentQuery.appointmentDate = { $gte: startDate, $lte: endDate };
    }

    // Filter by status
    if (status && status !== 'all') {
      if (status.includes(',')) {
        appointmentQuery.status = { $in: status.split(',').map((s) => s.trim()) };
      } else {
        appointmentQuery.status = status;
      }
    }

    const appointments = await Appointment.find(appointmentQuery)
      .sort({ appointmentDate: 1, startTime: 1 })
      .populate('customerId', 'name email phone avatarUrl')
      .populate('serviceId', 'name durationMinutes price')
      .populate({
        path: 'staffId',
        populate: { path: 'userId', select: 'name email phone' },
      });

    // Check check-in status from QueueEntry
    const aptIds = appointments.map((a) => a._id);
    const existingEntries = await QueueEntry.find({ appointmentId: { $in: aptIds } });
    const checkInMap = new Map();
    existingEntries.forEach((entry) => {
      checkInMap.set(entry.appointmentId.toString(), {
        queueEntryId: entry._id,
        tokenNumber: entry.ticketNumber,
        status: entry.status,
        joinedAt: entry.joinedAt,
      });
    });

    const appointmentsWithCheckIn = appointments.map((apt) => {
      const aptObj = apt.toObject ? apt.toObject() : apt;
      const checkInInfo = checkInMap.get(apt._id.toString());
      return {
        ...aptObj,
        isCheckedIn: Boolean(checkInInfo),
        queueStatus: checkInInfo ? checkInInfo.status : null,
        queueEntryId: checkInInfo ? checkInInfo.queueEntryId : null,
      };
    });

    // Compute KPI stats
    const stats = {
      total: appointmentsWithCheckIn.length,
      confirmed: appointmentsWithCheckIn.filter(
        (a) => ['confirmed', 'approved', 'pending'].includes(a.status) && !a.isCheckedIn
      ).length,
      checkedIn: appointmentsWithCheckIn.filter(
        (a) => a.isCheckedIn || a.status === 'in_progress'
      ).length,
      completed: appointmentsWithCheckIn.filter((a) => a.status === 'completed').length,
      cancelled: appointmentsWithCheckIn.filter((a) => a.status === 'cancelled').length,
    };

    return res.status(200).json({
      success: true,
      staff: {
        _id: staffDoc._id,
        name: staffDoc.name,
        email: staffDoc.email,
        phone: staffDoc.phone,
        title: staffDoc.title,
        workingDays: staffDoc.workingDays,
        workingHours: staffDoc.workingHours,
        services: staffDoc.serviceIds,
        user: staffDoc.userId,
      },
      business: {
        _id: business?._id,
        name: business?.name,
        category: business?.category,
        address: business?.address,
        contactPhone: business?.contactPhone,
      },
      detailedWorkingHours,
      stats,
      count: appointmentsWithCheckIn.length,
      appointments: appointmentsWithCheckIn,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve completed service history, counter audit logs, and practitioner metrics for staff
 * Protected: GET /api/staff/history (Role: staff, provider, admin)
 */
export const getStaffHistory = async (req, res, next) => {
  try {
    let staffDoc = null;

    if (req.user.role === 'staff') {
      staffDoc = await Staff.findOne({ userId: req.user._id, isActive: true })
        .populate('userId', 'name email phone avatarUrl')
        .populate('serviceIds', 'name durationMinutes price');

      if (!staffDoc) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'No active staff profile found associated with your account.',
            statusCode: 404,
          },
        });
      }
    } else if (req.user.role === 'provider' || req.user.role === 'admin') {
      if (req.query.staffId) {
        staffDoc = await Staff.findById(req.query.staffId)
          .populate('userId', 'name email phone avatarUrl')
          .populate('serviceIds', 'name durationMinutes price');
      } else {
        const ownedBiz = await Business.findOne({
          ownerId: req.user._id,
          isActive: true,
        });
        if (ownedBiz) {
          staffDoc = await Staff.findOne({ businessId: ownedBiz._id, isActive: true })
            .populate('userId', 'name email phone avatarUrl')
            .populate('serviceIds', 'name durationMinutes price');
        }
      }

      if (!staffDoc) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Staff profile not found for history lookup.',
            statusCode: 404,
          },
        });
      }

      if (req.user.role === 'provider') {
        const isOwner = await verifyBusinessOwnership(
          staffDoc.businessId,
          req.user._id,
          req.user.role
        );
        if (!isOwner) {
          return res.status(403).json({
            success: false,
            error: {
              message: 'Access denied: You are not authorized to view another provider\'s staff history.',
              statusCode: 403,
            },
          });
        }
      }
    } else {
      return res.status(403).json({
        success: false,
        error: { message: 'Unauthorized role for staff service history.', statusCode: 403 },
      });
    }

    const business = await Business.findById(staffDoc.businessId).select(
      'name category address contactPhone contactEmail'
    );

    // Extract filters and pagination
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 15));
    const skip = (page - 1) * limit;

    const {
      search,
      serviceId,
      status = 'completed',
      startDate,
      endDate,
      date,
      sortBy = 'appointmentDate',
      sortOrder = 'desc',
    } = req.query;

    const query = {
      businessId: staffDoc.businessId,
      staffId: staffDoc._id,
    };

    // Status filter
    if (status && status !== 'all') {
      if (status.includes(',')) {
        query.status = { $in: status.split(',').map((s) => s.trim()) };
      } else {
        query.status = status;
      }
    }

    // Service filter
    if (serviceId && serviceId !== 'all') {
      query.serviceId = serviceId;
    }

    // Date / Date range filter
    if (date) {
      query.appointmentDate = date;
    } else if (startDate && endDate) {
      const s = startDate <= endDate ? startDate : endDate;
      const e = startDate <= endDate ? endDate : startDate;
      query.appointmentDate = { $gte: s, $lte: e };
    } else if (startDate) {
      query.appointmentDate = { $gte: startDate };
    } else if (endDate) {
      query.appointmentDate = { $lte: endDate };
    }

    // If search is provided, match customer name or booking ref or token
    if (search && search.trim()) {
      const clean = search.trim();
      const regex = new RegExp(clean, 'i');

      const matchingUsers = await User.find({
        $or: [{ name: regex }, { email: regex }, { phone: regex }],
      }).select('_id');

      const customerIds = matchingUsers.map((u) => u._id);

      query.$or = [
        { bookingReference: regex },
        { tokenNumber: regex },
        { customerId: { $in: customerIds } },
      ];
    }

    // Sorting
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortDirection, startTime: sortDirection };

    // Execute queries
    const [totalMatching, appointments] = await Promise.all([
      Appointment.countDocuments(query),
      Appointment.find(query)
        .populate('customerId', 'name email phone avatarUrl')
        .populate('serviceId', 'name durationMinutes price')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Fetch matching queue entries to enrich actual duration, check-in time, and completion timestamps
    const appointmentIds = appointments.map((a) => a._id);
    const queueEntries =
      appointmentIds.length > 0
        ? await QueueEntry.find({ appointmentId: { $in: appointmentIds } }).lean()
        : [];

    const queueMap = new Map();
    queueEntries.forEach((qe) => {
      if (qe.appointmentId) {
        queueMap.set(qe.appointmentId.toString(), qe);
      }
    });

    // Enrich appointment records
    const enrichedHistory = appointments.map((apt) => {
      const qe = queueMap.get(apt._id.toString());

      let checkInTime = null;
      let completionTime = null;
      let actualDurationMinutes = null;
      let counterName = qe?.counterName || 'Counter 1';

      if (qe) {
        if (qe.joinedAt) checkInTime = qe.joinedAt;
        if (qe.completedAt) completionTime = qe.completedAt;
        if (typeof qe.serviceDurationSeconds === 'number' && qe.serviceDurationSeconds > 0) {
          actualDurationMinutes = Math.round(qe.serviceDurationSeconds / 60);
        } else if (qe.startedAt && qe.completedAt) {
          actualDurationMinutes = Math.max(
            1,
            Math.round((new Date(qe.completedAt) - new Date(qe.startedAt)) / 60000)
          );
        }
      }

      if (!completionTime && apt.status === 'completed' && apt.updatedAt) {
        completionTime = apt.updatedAt;
      }

      return {
        ...apt,
        checkInTime,
        completionTime,
        actualDurationMinutes,
        counterName,
        customerName: apt.customerId?.name || 'Customer',
        customerEmail: apt.customerId?.email || '',
        customerPhone: apt.customerId?.phone || '',
        serviceName: apt.serviceId?.name || 'Standard Service',
        serviceDurationMinutes: apt.serviceId?.durationMinutes || 30,
        servicePrice: apt.serviceId?.price || 0,
      };
    });

    // Calculate Summary Cards & Daily Grouping across all completed records of this staff member
    const todayStr = new Date().toISOString().split('T')[0];
    const allStaffCompleted = await Appointment.find({
      businessId: staffDoc.businessId,
      staffId: staffDoc._id,
      status: 'completed',
    })
      .populate('serviceId', 'name durationMinutes price')
      .lean();

    const allCompletedIds = allStaffCompleted.map((a) => a._id);
    const allQueueEntries =
      allCompletedIds.length > 0
        ? await QueueEntry.find({ appointmentId: { $in: allCompletedIds } }).lean()
        : [];

    const allQueueMap = new Map();
    allQueueEntries.forEach((qe) => {
      if (qe.appointmentId) allQueueMap.set(qe.appointmentId.toString(), qe);
    });

    let totalDurationSum = 0;
    let durationCount = 0;
    let todayCount = 0;

    // Daily breakdown accumulator
    const dailyMap = new Map();

    allStaffCompleted.forEach((apt) => {
      if (apt.appointmentDate === todayStr) {
        todayCount++;
      }

      const qe = allQueueMap.get(apt._id.toString());
      let dur = null;
      if (qe && typeof qe.serviceDurationSeconds === 'number' && qe.serviceDurationSeconds > 0) {
        dur = Math.round(qe.serviceDurationSeconds / 60);
      } else if (qe && qe.startedAt && qe.completedAt) {
        dur = Math.max(1, Math.round((new Date(qe.completedAt) - new Date(qe.startedAt)) / 60000));
      }

      if (dur !== null) {
        totalDurationSum += dur;
        durationCount++;
      }

      // Group daily
      const d = apt.appointmentDate || 'Unknown Date';
      if (!dailyMap.has(d)) {
        dailyMap.set(d, { date: d, visitCount: 0, durationMinutesSum: 0, withDurationCount: 0 });
      }
      const entry = dailyMap.get(d);
      entry.visitCount++;
      if (dur !== null) {
        entry.durationMinutesSum += dur;
        entry.withDurationCount++;
      }
    });

    const dailySummary = Array.from(dailyMap.values())
      .map((item) => ({
        date: item.date,
        visitCount: item.visitCount,
        totalDurationMinutes: item.durationMinutesSum,
        avgDurationMinutes:
          item.withDurationCount > 0
            ? Math.round(item.durationMinutesSum / item.withDurationCount)
            : null,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    const totalCompleted = allStaffCompleted.length;
    const avgDurationMinutes = durationCount > 0 ? Math.round(totalDurationSum / durationCount) : null;
    const totalPages = Math.ceil(totalMatching / limit) || 1;

    return res.status(200).json({
      success: true,
      summary: {
        totalCompleted,
        todayCompleted: todayCount,
        avgDurationMinutes,
        totalDurationMinutes: totalDurationSum,
        recordedDurationCount: durationCount,
      },
      pagination: {
        page,
        limit,
        totalRecords: totalMatching,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      dailySummary,
      history: enrichedHistory,
      staff: {
        _id: staffDoc._id,
        name: staffDoc.name,
        email: staffDoc.email,
        title: staffDoc.title,
        services: staffDoc.serviceIds,
      },
      business: {
        _id: business?._id,
        name: business?.name,
      },
    });
  } catch (error) {
    next(error);
  }
};
