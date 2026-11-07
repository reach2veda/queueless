import Appointment from '../models/appointment.model.js';
import Business from '../models/business.model.js';
import Service from '../models/service.model.js';
import Staff from '../models/staff.model.js';
import User from '../models/user.model.js';

/**
 * Format a Date to YYYY-MM-DD
 */
function toDateStr(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Get date range bounds based on timeframe preset
 */
function resolveTimeframeDates(timeframe) {
  const now = new Date();
  const todayStr = toDateStr(now);

  if (!timeframe || timeframe === 'all') {
    return { startDate: null, endDate: null };
  }

  const past = new Date(now);
  if (timeframe === '7days') {
    past.setDate(past.getDate() - 6);
  } else if (timeframe === '30days') {
    past.setDate(past.getDate() - 29);
  } else if (timeframe === '90days') {
    past.setDate(past.getDate() - 89);
  } else if (timeframe === '12months') {
    past.setFullYear(past.getFullYear() - 1);
  } else {
    return { startDate: null, endDate: null };
  }

  return {
    startDate: toDateStr(past),
    endDate: todayStr,
  };
}

/**
 * Format date to short readable label (e.g., 'Nov 07' or 'Nov 2026')
 */
function formatBucketLabel(key, granularity) {
  if (granularity === 'monthly') {
    const [y, m] = key.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1, 1));
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/**
 * Retrieve comprehensive business analytics for the authenticated provider
 * Protected: GET /api/analytics/provider (Role: provider, admin)
 */
export const getProviderAnalytics = async (req, res, next) => {
  try {
    let business = null;

    // 1. Resolve business strictly from authenticated session
    if (req.user.role === 'provider') {
      business = await Business.findOne({ ownerId: req.user._id, isActive: true });
      if (!business) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'No registered business found for your provider account',
            statusCode: 404,
          },
        });
      }
    } else if (req.user.role === 'admin') {
      if (req.query.businessId) {
        business = await Business.findById(req.query.businessId);
      } else {
        business = await Business.findOne({ isActive: true });
      }

      if (!business) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Business not found for analytics lookup',
            statusCode: 404,
          },
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied: Analytics are restricted to business providers and administrators.',
          statusCode: 403,
        },
      });
    }

    // 2. Resolve date filters and granularity
    let { startDate, endDate, timeframe = 'all', granularity = 'daily' } = req.query;

    if (!startDate && !endDate && timeframe && timeframe !== 'custom') {
      const preset = resolveTimeframeDates(timeframe);
      startDate = preset.startDate;
      endDate = preset.endDate;
    }

    // Handle inverted date range gracefully
    if (startDate && endDate && startDate > endDate) {
      const temp = startDate;
      startDate = endDate;
      endDate = temp;
    }

    // 3. Build query scoped strictly to this provider's business
    const appointmentQuery = { businessId: business._id };
    if (startDate && endDate) {
      appointmentQuery.appointmentDate = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      appointmentQuery.appointmentDate = { $gte: startDate };
    } else if (endDate) {
      appointmentQuery.appointmentDate = { $lte: endDate };
    }

    // 4. Fetch appointments with services and staff populated
    const appointments = await Appointment.find(appointmentQuery)
      .sort({ appointmentDate: 1, startTime: 1 })
      .populate('serviceId', 'name price durationMinutes category')
      .populate({
        path: 'staffId',
        populate: { path: 'userId', select: 'name email phone avatarUrl' },
      })
      .populate('customerId', 'name email phone');

    // 5. Calculate Key Overview Metrics
    const totalAppointments = appointments.length;
    let completedAppointments = 0;
    let cancelledAppointments = 0;
    let confirmedAppointments = 0;
    let pendingAppointments = 0;
    let inProgressAppointments = 0;
    let totalRevenue = 0;

    // Maps for aggregation
    const serviceMap = new Map();
    const staffMap = new Map();
    const trendMap = new Map();

    appointments.forEach((apt) => {
      // Status counting
      const status = apt.status || 'confirmed';
      if (status === 'completed') {
        completedAppointments++;
      } else if (status === 'cancelled') {
        cancelledAppointments++;
      } else if (status === 'confirmed' || status === 'approved') {
        confirmedAppointments++;
      } else if (status === 'pending') {
        pendingAppointments++;
      } else if (status === 'in_progress') {
        inProgressAppointments++;
      }

      // Safe price resolution (handle missing or invalid price)
      const servicePrice =
        typeof apt.serviceId?.price === 'number' && !isNaN(apt.serviceId.price) && apt.serviceId.price > 0
          ? apt.serviceId.price
          : 0;

      // REVENUE RULE: Only count revenue from COMPLETED appointments
      const earnedFromThis = status === 'completed' ? servicePrice : 0;
      if (status === 'completed') {
        totalRevenue += servicePrice;
      }

      // Popular Services Aggregation
      const serviceIdStr = apt.serviceId?._id ? apt.serviceId._id.toString() : 'unknown';
      const serviceName = apt.serviceId?.name || 'General Consultation';
      if (!serviceMap.has(serviceIdStr)) {
        serviceMap.set(serviceIdStr, {
          serviceId: serviceIdStr,
          name: serviceName,
          category: apt.serviceId?.category || 'Medical & Healthcare',
          price: servicePrice,
          totalBookings: 0,
          completedBookings: 0,
          cancelledBookings: 0,
          revenue: 0,
        });
      }
      const srvData = serviceMap.get(serviceIdStr);
      srvData.totalBookings++;
      if (status === 'completed') {
        srvData.completedBookings++;
        srvData.revenue += servicePrice;
      } else if (status === 'cancelled') {
        srvData.cancelledBookings++;
      }

      // Staff Performance Aggregation
      const staffKey = apt.staffId?._id ? apt.staffId._id.toString() : 'unassigned';
      const staffName = apt.staffId?.name || apt.staffId?.userId?.name || 'Unassigned / Clinic Pool';
      const staffTitle = apt.staffId?.title || 'Staff Practitioner';

      if (!staffMap.has(staffKey)) {
        staffMap.set(staffKey, {
          staffId: staffKey === 'unassigned' ? null : staffKey,
          name: staffName,
          title: staffTitle,
          totalAppointments: 0,
          completed: 0,
          cancelled: 0,
          confirmed: 0,
          revenue: 0,
        });
      }
      const stData = staffMap.get(staffKey);
      stData.totalAppointments++;
      if (status === 'completed') {
        stData.completed++;
        stData.revenue += servicePrice;
      } else if (status === 'cancelled') {
        stData.cancelled++;
      } else {
        stData.confirmed++;
      }

      // Trend Bucketing
      let bucketKey = apt.appointmentDate;
      if (granularity === 'monthly') {
        bucketKey = apt.appointmentDate ? apt.appointmentDate.slice(0, 7) : 'Unknown';
      } else if (granularity === 'weekly') {
        // Compute Monday of the week
        const [y, m, d] = (apt.appointmentDate || '2026-01-01').split('-').map(Number);
        const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
        const day = dt.getUTCDay();
        const diff = day === 0 ? -6 : 1 - day;
        dt.setUTCDate(dt.getUTCDate() + diff);
        bucketKey = dt.toISOString().slice(0, 10);
      }

      if (!trendMap.has(bucketKey)) {
        trendMap.set(bucketKey, {
          key: bucketKey,
          label: formatBucketLabel(bucketKey, granularity),
          total: 0,
          completed: 0,
          cancelled: 0,
          confirmed: 0,
          revenue: 0,
        });
      }
      const trData = trendMap.get(bucketKey);
      trData.total++;
      if (status === 'completed') {
        trData.completed++;
        trData.revenue += servicePrice;
      } else if (status === 'cancelled') {
        trData.cancelled++;
      } else {
        trData.confirmed++;
      }
    });

    // Finalize Revenue and Rates
    totalRevenue = Number(totalRevenue.toFixed(2));
    const pendingAndConfirmed = confirmedAppointments + pendingAppointments + inProgressAppointments;
    const completionRate =
      totalAppointments > 0 ? Number(((completedAppointments / totalAppointments) * 100).toFixed(1)) : 0;
    const cancellationRate =
      totalAppointments > 0 ? Number(((cancelledAppointments / totalAppointments) * 100).toFixed(1)) : 0;
    const averageRevenuePerCompleted =
      completedAppointments > 0 ? Number((totalRevenue / completedAppointments).toFixed(2)) : 0;

    // Sort Trend Data chronologically
    const trends = Array.from(trendMap.values()).sort((a, b) => a.key.localeCompare(b.key));

    // Sort Popular Services by totalBookings descending
    const popularServices = Array.from(serviceMap.values())
      .map((s) => ({
        ...s,
        revenue: Number(s.revenue.toFixed(2)),
        sharePercentage:
          totalAppointments > 0 ? Number(((s.totalBookings / totalAppointments) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.totalBookings - a.totalBookings);

    // Sort Staff Performance by totalAppointments descending
    const staffPerformance = Array.from(staffMap.values())
      .map((st) => ({
        ...st,
        revenue: Number(st.revenue.toFixed(2)),
        completionRate:
          st.totalAppointments > 0 ? Number(((st.completed / st.totalAppointments) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.totalAppointments - a.totalAppointments);

    // Status Distribution for charts
    const statusDistribution = [
      {
        status: 'completed',
        label: 'Completed',
        count: completedAppointments,
        percentage:
          totalAppointments > 0
            ? Number(((completedAppointments / totalAppointments) * 100).toFixed(1))
            : 0,
        color: '#16834A', // QueueLess Primary Green
      },
      {
        status: 'confirmed',
        label: 'Confirmed',
        count: confirmedAppointments,
        percentage:
          totalAppointments > 0
            ? Number(((confirmedAppointments / totalAppointments) * 100).toFixed(1))
            : 0,
        color: '#0284C7', // Sky Blue
      },
      {
        status: 'in_progress',
        label: 'In Queue',
        count: inProgressAppointments,
        percentage:
          totalAppointments > 0
            ? Number(((inProgressAppointments / totalAppointments) * 100).toFixed(1))
            : 0,
        color: '#0D9488', // Teal
      },
      {
        status: 'pending',
        label: 'Pending',
        count: pendingAppointments,
        percentage:
          totalAppointments > 0
            ? Number(((pendingAppointments / totalAppointments) * 100).toFixed(1))
            : 0,
        color: '#F59E0B', // Amber
      },
      {
        status: 'cancelled',
        label: 'Cancelled',
        count: cancelledAppointments,
        percentage:
          totalAppointments > 0
            ? Number(((cancelledAppointments / totalAppointments) * 100).toFixed(1))
            : 0,
        color: '#E11D48', // Rose
      },
    ];

    return res.status(200).json({
      success: true,
      business: {
        _id: business._id,
        name: business.name,
        category: business.category,
      },
      filter: {
        startDate: startDate || null,
        endDate: endDate || null,
        timeframe,
        granularity,
      },
      overview: {
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        confirmedAppointments,
        pendingAppointments,
        inProgressAppointments,
        pendingAndConfirmed,
        totalRevenue,
        completionRate,
        cancellationRate,
        averageRevenuePerCompleted,
      },
      trends,
      popularServices,
      statusDistribution,
      staffPerformance,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
//                   ADMIN PLATFORM INTELLIGENCE & ANALYTICS
// ============================================================================

/**
 * Resolves date bounds and previous equivalent comparison period for admin analytics
 */
function resolveAdminTimeframeDates(timeframe) {
  const now = new Date();
  const todayStr = toDateStr(now);

  if (!timeframe || timeframe === 'all') {
    return { startDate: null, endDate: null, prevStartDate: null, prevEndDate: null };
  }

  const past = new Date(now);
  let daysDiff = 30;
  if (timeframe === '7days') {
    daysDiff = 7;
    past.setDate(past.getDate() - 6);
  } else if (timeframe === '30days') {
    daysDiff = 30;
    past.setDate(past.getDate() - 29);
  } else if (timeframe === '90days') {
    daysDiff = 90;
    past.setDate(past.getDate() - 89);
  } else if (timeframe === '12months') {
    daysDiff = 365;
    past.setFullYear(past.getFullYear() - 1);
  } else {
    return { startDate: null, endDate: null, prevStartDate: null, prevEndDate: null };
  }

  const startDate = toDateStr(past);
  const endDate = todayStr;

  const prevEnd = new Date(past);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (daysDiff - 1));

  return {
    startDate,
    endDate,
    prevStartDate: toDateStr(prevStart),
    prevEndDate: toDateStr(prevEnd),
  };
}

/**
 * Compute bucket key for date string according to granularity
 */
function getBucketKey(dateStr, granularity) {
  if (!dateStr) return '2026-01-01';
  if (granularity === 'monthly') {
    return dateStr.slice(0, 7);
  }
  if (granularity === 'weekly') {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const day = dt.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    dt.setUTCDate(dt.getUTCDate() + diff);
    return dt.toISOString().slice(0, 10);
  }
  return dateStr;
}

/**
 * Core engine computing platform-wide analytics across MongoDB Atlas
 */
async function computeAdminAnalytics(query) {
  let { startDate, endDate, timeframe = 'all', granularity = 'daily', sortBy = 'revenue' } = query;

  if (!startDate && !endDate && timeframe && timeframe !== 'custom') {
    const preset = resolveAdminTimeframeDates(timeframe);
    startDate = preset.startDate;
    endDate = preset.endDate;
  }

  // Gracefully handle inverted date bounds
  if (startDate && endDate && startDate > endDate) {
    const temp = startDate;
    startDate = endDate;
    endDate = temp;
  }

  // Determine previous comparison period if bounds exist
  let prevStartDate = null;
  let prevEndDate = null;
  if (startDate && endDate) {
    const startDt = new Date(`${startDate}T00:00:00.000Z`);
    const endDt = new Date(`${endDate}T23:59:59.999Z`);
    const diffDays = Math.max(1, Math.round((endDt - startDt) / (1000 * 60 * 60 * 24)));
    const prevEnd = new Date(startDt);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - (diffDays - 1));
    prevStartDate = toDateStr(prevStart);
    prevEndDate = toDateStr(prevEnd);
  }

  // Build appointment query
  const appointmentQuery = {};
  if (startDate && endDate) {
    appointmentQuery.appointmentDate = { $gte: startDate, $lte: endDate };
  } else if (startDate) {
    appointmentQuery.appointmentDate = { $gte: startDate };
  } else if (endDate) {
    appointmentQuery.appointmentDate = { $lte: endDate };
  }

  const prevAppointmentQuery =
    prevStartDate && prevEndDate
      ? {
          appointmentDate: { $gte: prevStartDate, $lte: prevEndDate },
          status: 'completed',
        }
      : null;

  // Execute parallel database reads
  const [
    appointments,
    prevAppointments,
    allUsers,
    allBusinesses,
    activeBizCount,
    pendingBizCount,
  ] = await Promise.all([
    Appointment.find(appointmentQuery)
      .sort({ appointmentDate: 1, startTime: 1 })
      .populate('serviceId', 'name price category durationMinutes')
      .populate('businessId', 'name category address')
      .lean(),
    prevAppointmentQuery
      ? Appointment.find(prevAppointmentQuery).populate('serviceId', 'price').lean()
      : [],
    User.find().select('name email role isActive createdAt').lean(),
    Business.find().select('name category verificationStatus isActive createdAt').lean(),
    Business.countDocuments({ isActive: true }),
    Business.countDocuments({ verificationStatus: 'pending' }),
  ]);

  // Date bounds for Users and Businesses
  const startBound = startDate ? new Date(`${startDate}T00:00:00.000Z`) : null;
  const endBound = endDate ? new Date(`${endDate}T23:59:59.999Z`) : null;

  const inTimeframeUsers = allUsers.filter((u) => {
    if (!u.createdAt) return true;
    const d = new Date(u.createdAt);
    if (startBound && d < startBound) return false;
    if (endBound && d > endBound) return false;
    return true;
  });

  const inTimeframeBusinesses = allBusinesses.filter((b) => {
    if (!b.createdAt) return true;
    const d = new Date(b.createdAt);
    if (startBound && d < startBound) return false;
    if (endBound && d > endBound) return false;
    return true;
  });

  // 1. User Growth Over Time
  const userTrendMap = new Map();
  inTimeframeUsers.forEach((u) => {
    const dateStr = u.createdAt ? u.createdAt.toISOString().slice(0, 10) : '2026-01-01';
    const bucketKey = getBucketKey(dateStr, granularity);
    if (!userTrendMap.has(bucketKey)) {
      userTrendMap.set(bucketKey, {
        key: bucketKey,
        label: formatBucketLabel(bucketKey, granularity),
        total: 0,
        customer: 0,
        provider: 0,
        staff: 0,
        admin: 0,
      });
    }
    const item = userTrendMap.get(bucketKey);
    item.total++;
    const r = u.role || 'customer';
    if (r === 'customer' || r === 'user') item.customer++;
    else if (r === 'provider') item.provider++;
    else if (r === 'staff') item.staff++;
    else if (r === 'admin') item.admin++;
  });
  const userGrowth = Array.from(userTrendMap.values()).sort((a, b) => a.key.localeCompare(b.key));

  // 2. Business Growth Over Time
  const bizTrendMap = new Map();
  inTimeframeBusinesses.forEach((b) => {
    const dateStr = b.createdAt ? b.createdAt.toISOString().slice(0, 10) : '2026-01-01';
    const bucketKey = getBucketKey(dateStr, granularity);
    if (!bizTrendMap.has(bucketKey)) {
      bizTrendMap.set(bucketKey, {
        key: bucketKey,
        label: formatBucketLabel(bucketKey, granularity),
        total: 0,
        verified: 0,
        pending: 0,
        rejected: 0,
      });
    }
    const item = bizTrendMap.get(bucketKey);
    item.total++;
    const vs = b.verificationStatus || 'pending';
    if (vs === 'verified') item.verified++;
    else if (vs === 'rejected') item.rejected++;
    else item.pending++;
  });
  const businessGrowth = Array.from(bizTrendMap.values()).sort((a, b) => a.key.localeCompare(b.key));

  // 3. Appointments & Revenue Metrics
  const totalAppointments = appointments.length;
  let completedAppointments = 0;
  let cancelledAppointments = 0;
  let confirmedAppointments = 0;
  let pendingAppointments = 0;
  let inProgressAppointments = 0;
  let totalRevenue = 0;

  const apptTrendMap = new Map();
  const revTrendMap = new Map();
  const serviceMap = new Map();
  const businessPerformanceMap = new Map();
  const monthlyRevMap = new Map();

  appointments.forEach((apt) => {
    const status = apt.status || 'confirmed';
    if (status === 'completed') completedAppointments++;
    else if (status === 'cancelled') cancelledAppointments++;
    else if (status === 'confirmed' || status === 'approved') confirmedAppointments++;
    else if (status === 'pending') pendingAppointments++;
    else if (status === 'in_progress') inProgressAppointments++;

    // Safe price resolution (handle undefined/null/NaN prices)
    const servicePrice =
      typeof apt.serviceId?.price === 'number' && !isNaN(apt.serviceId.price) && apt.serviceId.price > 0
        ? apt.serviceId.price
        : 0;

    // Strict Revenue Rule: ONLY completed appointments count as revenue
    if (status === 'completed') {
      totalRevenue += servicePrice;
    }

    // Appointment Trends Bucketing
    const dateStr = apt.appointmentDate || '2026-01-01';
    const bucketKey = getBucketKey(dateStr, granularity);

    if (!apptTrendMap.has(bucketKey)) {
      apptTrendMap.set(bucketKey, {
        key: bucketKey,
        label: formatBucketLabel(bucketKey, granularity),
        total: 0,
        completed: 0,
        cancelled: 0,
        pending: 0,
        confirmed: 0,
      });
    }
    const apptItem = apptTrendMap.get(bucketKey);
    apptItem.total++;
    if (status === 'completed') apptItem.completed++;
    else if (status === 'cancelled') apptItem.cancelled++;
    else if (status === 'pending') apptItem.pending++;
    else apptItem.confirmed++;

    // Revenue Trends Bucketing
    if (!revTrendMap.has(bucketKey)) {
      revTrendMap.set(bucketKey, {
        key: bucketKey,
        label: formatBucketLabel(bucketKey, granularity),
        revenue: 0,
        completedCount: 0,
      });
    }
    const revItem = revTrendMap.get(bucketKey);
    if (status === 'completed') {
      revItem.revenue += servicePrice;
      revItem.completedCount++;
    }

    // Monthly Revenue Aggregation
    if (status === 'completed' && apt.appointmentDate) {
      const mKey = apt.appointmentDate.slice(0, 7);
      if (!monthlyRevMap.has(mKey)) {
        monthlyRevMap.set(mKey, {
          month: mKey,
          label: formatBucketLabel(mKey, 'monthly'),
          revenue: 0,
          completedCount: 0,
        });
      }
      const mData = monthlyRevMap.get(mKey);
      mData.revenue += servicePrice;
      mData.completedCount++;
    }

    // Business Performance Aggregation
    const bizIdStr = apt.businessId?._id ? apt.businessId._id.toString() : 'unassigned';
    const bizName = apt.businessId?.name || 'Unassigned Clinic';
    const bizCategory = apt.businessId?.category || 'other';

    if (!businessPerformanceMap.has(bizIdStr)) {
      businessPerformanceMap.set(bizIdStr, {
        businessId: bizIdStr,
        name: bizName,
        category: bizCategory,
        totalAppointments: 0,
        completedAppointments: 0,
        cancelledAppointments: 0,
        revenue: 0,
      });
    }
    const bizPerf = businessPerformanceMap.get(bizIdStr);
    bizPerf.totalAppointments++;
    if (status === 'completed') {
      bizPerf.completedAppointments++;
      bizPerf.revenue += servicePrice;
    } else if (status === 'cancelled') {
      bizPerf.cancelledAppointments++;
    }

    // Popular Services Aggregation
    const srvIdStr = apt.serviceId?._id ? apt.serviceId._id.toString() : 'unknown';
    const srvName = apt.serviceId?.name || 'General Consultation';
    const srvCategory = apt.serviceId?.category || bizCategory || 'healthcare';

    if (!serviceMap.has(srvIdStr)) {
      serviceMap.set(srvIdStr, {
        serviceId: srvIdStr,
        name: srvName,
        businessName: bizName,
        category: srvCategory,
        price: servicePrice,
        totalBookings: 0,
        completedBookings: 0,
        revenue: 0,
      });
    }
    const srvItem = serviceMap.get(srvIdStr);
    srvItem.totalBookings++;
    if (status === 'completed') {
      srvItem.completedBookings++;
      srvItem.revenue += servicePrice;
    }
  });

  // Calculate Previous Period Revenue
  let prevRevenue = 0;
  prevAppointments.forEach((apt) => {
    const price =
      typeof apt.serviceId?.price === 'number' && !isNaN(apt.serviceId.price) && apt.serviceId.price > 0
        ? apt.serviceId.price
        : 0;
    prevRevenue += price;
  });

  totalRevenue = Number(totalRevenue.toFixed(2));
  prevRevenue = Number(prevRevenue.toFixed(2));

  const revenueGrowthRate =
    prevRevenue > 0
      ? Number((((totalRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1))
      : totalRevenue > 0
      ? 100
      : 0;

  // Format Trends
  const appointmentTrends = Array.from(apptTrendMap.values()).sort((a, b) =>
    a.key.localeCompare(b.key)
  );
  const revenueTrends = Array.from(revTrendMap.values())
    .map((r) => ({ ...r, revenue: Number(r.revenue.toFixed(2)) }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const monthlyRevenue = Array.from(monthlyRevMap.values())
    .map((m) => ({ ...m, revenue: Number(m.revenue.toFixed(2)) }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Format Leaderboard
  const leaderboard = Array.from(businessPerformanceMap.values()).map((b) => ({
    ...b,
    revenue: Number(b.revenue.toFixed(2)),
    completionRate:
      b.totalAppointments > 0
        ? Number(((b.completedAppointments / b.totalAppointments) * 100).toFixed(1))
        : 0,
  }));

  if (sortBy === 'appointments' || sortBy === 'volume') {
    leaderboard.sort((a, b) => b.totalAppointments - a.totalAppointments);
  } else {
    leaderboard.sort((a, b) => b.revenue - a.revenue);
  }

  // Format Popular Services
  const popularServices = Array.from(serviceMap.values())
    .map((s) => ({
      ...s,
      revenue: Number(s.revenue.toFixed(2)),
      sharePercentage:
        totalAppointments > 0 ? Number(((s.totalBookings / totalAppointments) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.totalBookings - a.totalBookings)
    .slice(0, 10);

  // Status Distribution
  const statusDistribution = [
    { name: 'Completed', value: completedAppointments, color: '#16834A' },
    { name: 'Confirmed', value: confirmedAppointments, color: '#0284C7' },
    { name: 'In Queue', value: inProgressAppointments, color: '#0D9488' },
    { name: 'Pending', value: pendingAppointments, color: '#D97706' },
    { name: 'Cancelled', value: cancelledAppointments, color: '#DC2626' },
  ];

  // User Role Distribution
  let custCount = 0, provCount = 0, staffCount = 0, adminCount = 0;
  allUsers.forEach((u) => {
    const r = u.role || 'customer';
    if (r === 'customer' || r === 'user') custCount++;
    else if (r === 'provider') provCount++;
    else if (r === 'staff') staffCount++;
    else if (r === 'admin') adminCount++;
  });
  const roleDistribution = [
    { name: 'Customers', value: custCount, color: '#0284C7' },
    { name: 'Providers', value: provCount, color: '#7C3AED' },
    { name: 'Staff', value: staffCount, color: '#16834A' },
    { name: 'Admins', value: adminCount, color: '#D97706' },
  ];

  // Business Verification Distribution
  let verifiedBiz = 0, pendingBiz = 0, rejectedBiz = 0;
  allBusinesses.forEach((b) => {
    const vs = b.verificationStatus || 'pending';
    if (vs === 'verified') verifiedBiz++;
    else if (vs === 'rejected') rejectedBiz++;
    else pendingBiz++;
  });
  const verificationDistribution = [
    { name: 'Verified', value: verifiedBiz, color: '#16834A' },
    { name: 'Pending', value: pendingBiz, color: '#D97706' },
    { name: 'Rejected', value: rejectedBiz, color: '#DC2626' },
  ];

  // Executive KPIs
  const kpis = {
    totalUsers: inTimeframeUsers.length,
    totalBusinesses: inTimeframeBusinesses.length,
    totalAppointments,
    totalCompleted: completedAppointments,
    totalCancelled: cancelledAppointments,
    totalRevenue,
    activeBusinesses: activeBizCount,
    pendingVerification: pendingBizCount,
    completionRate:
      totalAppointments > 0 ? Number(((completedAppointments / totalAppointments) * 100).toFixed(1)) : 0,
    cancellationRate:
      totalAppointments > 0 ? Number(((cancelledAppointments / totalAppointments) * 100).toFixed(1)) : 0,
    previousRevenue: prevRevenue,
    revenueGrowthRate,
    lifetimeUsers: allUsers.length,
    lifetimeBusinesses: allBusinesses.length,
  };

  return {
    timeframe: {
      timeframe,
      granularity,
      startDate: startDate || null,
      endDate: endDate || null,
      prevStartDate,
      prevEndDate,
    },
    kpis,
    userGrowth,
    businessGrowth,
    appointmentTrends,
    revenueTrends,
    leaderboard,
    popularServices,
    statusDistribution,
    roleDistribution,
    verificationDistribution,
    monthlyRevenue,
  };
}

/**
 * Platform-wide comprehensive analytics overview
 * Protected: GET /api/analytics/admin/overview (Role: admin)
 */
export const getAdminOverview = async (req, res, next) => {
  try {
    const analytics = await computeAdminAnalytics(req.query);
    return res.status(200).json({
      success: true,
      ...analytics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Platform user growth analytics
 * Protected: GET /api/analytics/admin/users (Role: admin)
 */
export const getAdminUserAnalytics = async (req, res, next) => {
  try {
    const analytics = await computeAdminAnalytics(req.query);
    return res.status(200).json({
      success: true,
      kpis: {
        totalUsers: analytics.kpis.totalUsers,
        lifetimeUsers: analytics.kpis.lifetimeUsers,
      },
      userGrowth: analytics.userGrowth,
      roleDistribution: analytics.roleDistribution,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Platform business growth & verification analytics
 * Protected: GET /api/analytics/admin/businesses (Role: admin)
 */
export const getAdminBusinessAnalytics = async (req, res, next) => {
  try {
    const analytics = await computeAdminAnalytics(req.query);
    return res.status(200).json({
      success: true,
      kpis: {
        totalBusinesses: analytics.kpis.totalBusinesses,
        activeBusinesses: analytics.kpis.activeBusinesses,
        pendingVerification: analytics.kpis.pendingVerification,
        lifetimeBusinesses: analytics.kpis.lifetimeBusinesses,
      },
      businessGrowth: analytics.businessGrowth,
      verificationDistribution: analytics.verificationDistribution,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Platform appointment volume & status distribution
 * Protected: GET /api/analytics/admin/appointments (Role: admin)
 */
export const getAdminAppointmentAnalytics = async (req, res, next) => {
  try {
    const analytics = await computeAdminAnalytics(req.query);
    return res.status(200).json({
      success: true,
      kpis: {
        totalAppointments: analytics.kpis.totalAppointments,
        totalCompleted: analytics.kpis.totalCompleted,
        totalCancelled: analytics.kpis.totalCancelled,
        completionRate: analytics.kpis.completionRate,
        cancellationRate: analytics.kpis.cancellationRate,
      },
      appointmentTrends: analytics.appointmentTrends,
      statusDistribution: analytics.statusDistribution,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Platform revenue trends & monthly summaries
 * Protected: GET /api/analytics/admin/revenue (Role: admin)
 */
export const getAdminRevenueAnalytics = async (req, res, next) => {
  try {
    const analytics = await computeAdminAnalytics(req.query);
    return res.status(200).json({
      success: true,
      kpis: {
        totalRevenue: analytics.kpis.totalRevenue,
        previousRevenue: analytics.kpis.previousRevenue,
        revenueGrowthRate: analytics.kpis.revenueGrowthRate,
      },
      revenueTrends: analytics.revenueTrends,
      monthlyRevenue: analytics.monthlyRevenue,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Business performance leaderboard
 * Protected: GET /api/analytics/admin/performance (Role: admin)
 */
export const getAdminBusinessPerformance = async (req, res, next) => {
  try {
    const analytics = await computeAdminAnalytics(req.query);
    return res.status(200).json({
      success: true,
      leaderboard: analytics.leaderboard,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Popular services platform-wide
 * Protected: GET /api/analytics/admin/services (Role: admin)
 */
export const getAdminPopularServices = async (req, res, next) => {
  try {
    const analytics = await computeAdminAnalytics(req.query);
    return res.status(200).json({
      success: true,
      popularServices: analytics.popularServices,
    });
  } catch (error) {
    next(error);
  }
};


