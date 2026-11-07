import Announcement from '../models/announcement.model.js';
import Business from '../models/business.model.js';
import Appointment from '../models/appointment.model.js';
import Notification from '../models/notification.model.js';

/**
 * Helper to fetch provider's business
 */
const getProviderBusiness = async (userId, userRole) => {
  if (userRole === 'admin') {
    return await Business.findOne({ isActive: true });
  }
  return await Business.findOne({ ownerId: userId, isActive: true });
};

/**
 * Create a new announcement
 * Protected: POST /api/announcements (Role: provider, admin)
 */
export const createAnnouncement = async (req, res, next) => {
  try {
    const business = await getProviderBusiness(req.user._id, req.user.role);
    if (!business) {
      return res.status(404).json({
        success: false,
        error: { message: 'No registered business found for your provider account', statusCode: 404 },
      });
    }

    const {
      title,
      description,
      type = 'general',
      startDate,
      endDate,
      priority = 'medium',
      isPublished = true,
      notifyCustomers = false,
    } = req.body;

    if (!title || !description || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: { message: 'Title, description, startDate, and endDate are required', statusCode: 400 },
      });
    }

    const announcement = new Announcement({
      businessId: business._id,
      createdById: req.user._id,
      title: title.trim(),
      description: description.trim(),
      type,
      startDate,
      endDate,
      priority,
      isPublished: Boolean(isPublished),
    });

    await announcement.save();

    // In-app notifications for relevant customers (Module 5)
    if (announcement.isPublished && (notifyCustomers || ['urgent', 'high'].includes(priority) || ['temporary_closure', 'booking_delay', 'holiday'].includes(type))) {
      try {
        // Find customers who have appointments with this business
        const recentApts = await Appointment.find({
          businessId: business._id,
          status: { $in: ['confirmed', 'pending', 'in_progress'] },
        }).distinct('customerId');

        if (recentApts.length > 0) {
          const notificationDocs = recentApts.map((customerId) => ({
            recipientId: customerId,
            businessId: business._id,
            title: `Announcement: ${announcement.title}`,
            message: announcement.description.slice(0, 300),
            type: 'announcement',
            metadata: { announcementId: announcement._id, announcementType: announcement.type },
          }));
          await Notification.insertMany(notificationDocs);
        }
      } catch (notifyErr) {
        console.warn('Customer notification dispatch note:', notifyErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      announcement,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all announcements for the authenticated provider's business
 * Protected: GET /api/announcements/my (Role: provider, admin)
 */
export const getMyAnnouncements = async (req, res, next) => {
  try {
    const business = await getProviderBusiness(req.user._id, req.user.role);
    if (!business) {
      return res.status(404).json({
        success: false,
        error: { message: 'No registered business found for your account', statusCode: 404 },
      });
    }

    const announcements = await Announcement.find({ businessId: business._id })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      businessId: business._id,
      count: announcements.length,
      announcements,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get active announcements for a business (Public / Customer-facing)
 * Public: GET /api/announcements/business/:businessId
 */
export const getActiveAnnouncementsByBusiness = async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const todayStr = new Date().toISOString().slice(0, 10);

    const announcements = await Announcement.find({
      businessId,
      isPublished: true,
      startDate: { $lte: todayStr },
      endDate: { $gte: todayStr },
    }).sort({ priority: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: announcements.length,
      announcements,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an announcement
 * Protected: PATCH /api/announcements/:id (Role: provider, admin)
 */
export const updateAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: { message: 'Announcement not found', statusCode: 404 },
      });
    }

    // Ownership check: Provider A cannot edit Provider B's announcement
    if (req.user.role !== 'admin') {
      const business = await Business.findById(announcement.businessId);
      if (!business || business.ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          error: { message: 'Access denied: You are not authorized to update this announcement.', statusCode: 403 },
        });
      }
    }

    const { title, description, type, startDate, endDate, priority, isPublished } = req.body;

    if (title !== undefined) announcement.title = title.trim();
    if (description !== undefined) announcement.description = description.trim();
    if (type !== undefined) announcement.type = type;
    if (startDate !== undefined) announcement.startDate = startDate;
    if (endDate !== undefined) announcement.endDate = endDate;
    if (priority !== undefined) announcement.priority = priority;
    if (isPublished !== undefined) announcement.isPublished = Boolean(isPublished);

    await announcement.save();

    return res.status(200).json({
      success: true,
      message: 'Announcement updated successfully',
      announcement,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle publish / unpublish status
 * Protected: PATCH /api/announcements/:id/publish (Role: provider, admin)
 */
export const togglePublishAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: { message: 'Announcement not found', statusCode: 404 },
      });
    }

    if (req.user.role !== 'admin') {
      const business = await Business.findById(announcement.businessId);
      if (!business || business.ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          error: { message: 'Access denied: You do not own this announcement.', statusCode: 403 },
        });
      }
    }

    announcement.isPublished = !announcement.isPublished;
    await announcement.save();

    return res.status(200).json({
      success: true,
      message: `Announcement ${announcement.isPublished ? 'published' : 'unpublished'} successfully`,
      announcement,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an announcement
 * Protected: DELETE /api/announcements/:id (Role: provider, admin)
 */
export const deleteAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: { message: 'Announcement not found', statusCode: 404 },
      });
    }

    if (req.user.role !== 'admin') {
      const business = await Business.findById(announcement.businessId);
      if (!business || business.ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          error: { message: 'Access denied: You do not own this announcement.', statusCode: 403 },
        });
      }
    }

    await Announcement.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Announcement deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

