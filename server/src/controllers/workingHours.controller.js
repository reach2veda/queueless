import WorkingHours from '../models/workingHours.model.js';
import Business from '../models/business.model.js';

/**
 * Helper to verify that the logged-in user owns the business
 */
const verifyBusinessOwnership = async (businessId, userId, userRole) => {
  if (userRole === 'admin') return true;
  const business = await Business.findById(businessId);
  if (!business) return null;
  return business.ownerId.toString() === userId.toString();
};

/**
 * Configure / batch update weekly working hours for business or staff
 * Protected: POST /api/working-hours (Role: provider, admin)
 */
export const setWorkingHours = async (req, res, next) => {
  try {
    const { businessId, staffId = null, schedules } = req.body;

    const isOwner = await verifyBusinessOwnership(businessId, req.user._id, req.user.role);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied: You are not authorized to configure working hours for this business.',
          statusCode: 403,
        },
      });
    }

    const updatedSchedules = [];

    // Atomic upserts for each day of week (0 to 6)
    for (const item of schedules) {
      const filter = {
        businessId,
        staffId: staffId || null,
        dayOfWeek: item.dayOfWeek,
      };

      const update = {
        isOpen: item.isOpen,
        openTime: item.openTime || '09:00',
        closeTime: item.closeTime || '17:00',
        breakStartTime: item.breakStartTime || null,
        breakEndTime: item.breakEndTime || null,
      };

      const record = await WorkingHours.findOneAndUpdate(
        filter,
        { $set: update },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      updatedSchedules.push(record);
    }

    return res.status(200).json({
      success: true,
      message: 'Working hours updated successfully',
      schedules: updatedSchedules.sort((a, b) => a.dayOfWeek - b.dayOfWeek),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get weekly schedule for a business or staff member
 * Public: GET /api/working-hours?businessId=...&staffId=...
 */
export const getWorkingHours = async (req, res, next) => {
  try {
    const { businessId, staffId } = req.query;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        error: { message: 'businessId query parameter is required', statusCode: 400 },
      });
    }

    const filter = {
      businessId,
      staffId: staffId ? staffId : null,
    };

    const hours = await WorkingHours.find(filter).sort({ dayOfWeek: 1 });

    return res.status(200).json({
      success: true,
      count: hours.length,
      hours,
    });
  } catch (error) {
    next(error);
  }
};

