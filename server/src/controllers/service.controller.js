import Service from '../models/service.model.js';
import Business from '../models/business.model.js';
import Appointment from '../models/appointment.model.js';
import { logAuditEvent } from '../utils/auditLogger.js';

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
 * Retrieve all services belonging to the authenticated provider's business
 * Protected: GET /api/services/my (Role: provider, admin)
 */
export const getMyServices = async (req, res, next) => {
  try {
    const business = await Business.findOne({ ownerId: req.user._id, isActive: true });
    if (!business) {
      return res.status(404).json({
        success: false,
        error: { message: 'No registered business profile found for your provider account', statusCode: 404 },
      });
    }

    // Providers see ALL services (both active and inactive) so they can manage catalog
    const services = await Service.find({ businessId: business._id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      businessId: business._id,
      businessName: business.name,
      count: services.length,
      services,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new service under a business
 * Protected: POST /api/services (Role: provider, admin)
 */
export const createService = async (req, res, next) => {
  try {
    let { businessId, name, description, durationMinutes, price, isActive = true } = req.body;

    // If businessId is omitted, automatically infer from the authenticated provider's profile
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

    // Verify multi-tenant business ownership
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
          message: 'Access denied: You are not authorized to add services to this business.',
          statusCode: 403,
        },
      });
    }

    // Check for duplicate service name within the same business (case-insensitive)
    const trimmedName = name.trim();
    const existingService = await Service.findOne({
      businessId,
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
      isActive: true,
    });
    if (existingService) {
      return res.status(409).json({
        success: false,
        error: {
          message: `An active service named "${trimmedName}" already exists for your business.`,
          statusCode: 409,
        },
      });
    }

    const service = new Service({
      businessId,
      name: trimmedName,
      description: description ? description.trim() : '',
      durationMinutes: Number(durationMinutes) || 30,
      price: Number(price) >= 0 ? Number(price) : 0,
      isActive: Boolean(isActive),
    });

    await service.save();

    await logAuditEvent({
      req,
      action: 'SERVICE_CREATED',
      actionCategory: 'SERVICE',
      description: `Service "${service.name}" created ($${service.price}, ${service.durationMinutes} mins).`,
      resourceType: 'Service',
      resourceId: service._id,
      resourceName: service.name,
      status: 'success',
      severity: 'info',
      updatedState: { name: service.name, price: service.price, durationMinutes: service.durationMinutes },
    });

    return res.status(201).json({
      success: true,
      message: 'Service created successfully',
      service,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get active services for a business (or all services if includeInactive=true for providers)
 * Public: GET /api/services?businessId=...
 */
export const getServicesByBusiness = async (req, res, next) => {
  try {
    let { businessId, includeInactive } = req.query;

    if (!businessId && req.user) {
      const ownedBiz = await Business.findOne({ ownerId: req.user._id });
      if (ownedBiz) businessId = ownedBiz._id;
    }

    if (!businessId) {
      return res.status(400).json({
        success: false,
        error: { message: 'businessId query parameter is required', statusCode: 400 },
      });
    }

    const query = { businessId };
    if (includeInactive !== 'true' && includeInactive !== true) {
      query.isActive = true;
    }

    const services = await Service.find(query).sort({ name: 1 });

    return res.status(200).json({
      success: true,
      count: services.length,
      services,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single service details
 * Public: GET /api/services/:id
 */
export const getServiceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const service = await Service.findById(id).populate('businessId', 'name category address');
    if (!service) {
      return res.status(404).json({
        success: false,
        error: { message: 'Service not found', statusCode: 404 },
      });
    }

    return res.status(200).json({
      success: true,
      service,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a service (name, description, duration, price, active status)
 * Protected: PATCH /api/services/:id (Role: provider, admin)
 */
export const updateService = async (req, res, next) => {
  try {
    const { id } = req.params;

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        error: { message: 'Service not found', statusCode: 404 },
      });
    }

    const isOwner = await verifyBusinessOwnership(service.businessId, req.user._id, req.user.role);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied: You are not authorized to update this service.',
          statusCode: 403,
        },
      });
    }

    const { name, description, durationMinutes, price, isActive } = req.body;

    if (name !== undefined) {
      const trimmedName = name.trim();
      // Check collision with another active service in the same business
      const collision = await Service.findOne({
        businessId: service.businessId,
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
        _id: { $ne: service._id },
        isActive: true,
      });
      if (collision) {
        return res.status(409).json({
          success: false,
          error: {
            message: `Another active service named "${trimmedName}" already exists for this business.`,
            statusCode: 409,
          },
        });
      }
      service.name = trimmedName;
    }

    const prevServiceState = {
      name: service.name,
      price: service.price,
      durationMinutes: service.durationMinutes,
      isActive: service.isActive,
    };

    if (description !== undefined) {
      service.description = description ? description.trim() : '';
    }
    if (durationMinutes !== undefined) {
      service.durationMinutes = Number(durationMinutes);
    }
    if (price !== undefined) {
      service.price = Math.max(0, Number(price));
    }
    if (isActive !== undefined) {
      service.isActive = Boolean(isActive);
    }

    await service.save();

    await logAuditEvent({
      req,
      action: 'SERVICE_UPDATED',
      actionCategory: 'SERVICE',
      description: `Service "${service.name}" updated.`,
      resourceType: 'Service',
      resourceId: service._id,
      resourceName: service.name,
      status: 'success',
      severity: 'info',
      previousState: prevServiceState,
      updatedState: {
        name: service.name,
        price: service.price,
        durationMinutes: service.durationMinutes,
        isActive: service.isActive,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      service,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Safely delete or deactivate a service
 * Protected: DELETE /api/services/:id (Role: provider, admin)
 *
 * Rules:
 * 1. If active/upcoming appointments exist: BLOCKS deletion with HTTP 400.
 * 2. If historical (completed/cancelled) appointments exist: Soft-deletes (sets isActive=false)
 *    to preserve historical data integrity.
 * 3. If zero appointments exist: Permanently removes document from MongoDB.
 */
export const deleteService = async (req, res, next) => {
  try {
    const { id } = req.params;

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        error: { message: 'Service not found', statusCode: 404 },
      });
    }

    const isOwner = await verifyBusinessOwnership(service.businessId, req.user._id, req.user.role);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied: You are not authorized to delete this service.',
          statusCode: 403,
        },
      });
    }

    // 1. Safety Check: Active / upcoming bookings
    const activeApts = await Appointment.countDocuments({
      serviceId: service._id,
      status: { $in: ['pending', 'confirmed', 'approved', 'in_progress'] },
    });

    if (activeApts > 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Cannot delete service: There are ${activeApts} active appointment(s) booked for "${service.name}". Please deactivate the service instead, or reschedule/cancel the bookings first.`,
          statusCode: 400,
          activeAppointments: activeApts,
        },
      });
    }

    // 2. Check for historical bookings (completed, cancelled, no_show)
    const totalApts = await Appointment.countDocuments({ serviceId: service._id });
    if (totalApts > 0) {
      // Soft-delete to preserve foreign key references and historical reports
      service.isActive = false;
      await service.save();

      await logAuditEvent({
        req,
        action: 'SERVICE_DELETED',
        actionCategory: 'SERVICE',
        description: `Service "${service.name}" was deactivated (soft-deleted) due to ${totalApts} historical appointments.`,
        resourceType: 'Service',
        resourceId: service._id,
        resourceName: service.name,
        status: 'success',
        severity: 'warning',
      });

      return res.status(200).json({
        success: true,
        message: `Service has ${totalApts} historical visit record(s). It has been deactivated and hidden from customers to preserve appointment logs.`,
        softDeleted: true,
        service,
      });
    }

    // 3. Completely unreferenced: Safe to permanently delete from MongoDB
    await Service.findByIdAndDelete(service._id);

    await logAuditEvent({
      req,
      action: 'SERVICE_DELETED',
      actionCategory: 'SERVICE',
      description: `Service "${service.name}" was permanently deleted.`,
      resourceType: 'Service',
      resourceId: service._id,
      resourceName: service.name,
      status: 'success',
      severity: 'warning',
    });

    return res.status(200).json({
      success: true,
      message: 'Service deleted permanently.',
      permanentlyDeleted: true,
    });
  } catch (error) {
    next(error);
  }
};

