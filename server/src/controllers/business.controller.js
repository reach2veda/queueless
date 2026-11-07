import Business from '../models/business.model.js';
import Service from '../models/service.model.js';
import WorkingHours from '../models/workingHours.model.js';
import Staff from '../models/staff.model.js';

/**
 * Register a new business profile
 * Protected: POST /api/businesses (Role: provider, admin)
 */
export const createBusiness = async (req, res, next) => {
  try {
    const ownerId = req.user._id;

    // Check if provider already has an active business profile
    const existingBusiness = await Business.findOne({ ownerId, isActive: true });
    if (existingBusiness && req.user.role !== 'admin') {
      return res.status(409).json({
        success: false,
        error: {
          message: 'You already have an active business profile.',
          statusCode: 409,
          businessId: existingBusiness._id,
        },
      });
    }

    const {
      name,
      category,
      description,
      contactPhone,
      contactEmail,
      address,
      timezone,
    } = req.body;

    const business = new Business({
      name,
      ownerId,
      category,
      description,
      contactPhone,
      contactEmail: contactEmail || req.user.email,
      address,
      timezone: timezone || 'UTC',
      // Demonstration clinic auto-verified or pending
      verificationStatus: 'verified', // Auto-verify for development demo
    });

    await business.save();

    // Create default working hours (Monday to Friday 09:00 - 17:00, Sat 09:00 - 14:00, Sun Closed)
    const defaultHours = [
      { dayOfWeek: 0, isOpen: false, openTime: '09:00', closeTime: '17:00' }, // Sun
      { dayOfWeek: 1, isOpen: true, openTime: '09:00', closeTime: '17:00' }, // Mon
      { dayOfWeek: 2, isOpen: true, openTime: '09:00', closeTime: '17:00' }, // Tue
      { dayOfWeek: 3, isOpen: true, openTime: '09:00', closeTime: '17:00' }, // Wed
      { dayOfWeek: 4, isOpen: true, openTime: '09:00', closeTime: '17:00' }, // Thu
      { dayOfWeek: 5, isOpen: true, openTime: '09:00', closeTime: '17:00' }, // Fri
      { dayOfWeek: 6, isOpen: true, openTime: '09:00', closeTime: '14:00' }, // Sat
    ].map((h) => ({ ...h, businessId: business._id, staffId: null }));

    await WorkingHours.insertMany(defaultHours);

    return res.status(201).json({
      success: true,
      message: 'Business profile created successfully',
      business,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List / search verified businesses
 * Public: GET /api/businesses
 */
export const getBusinesses = async (req, res, next) => {
  try {
    const { category, city, search, page = 1, limit = 10 } = req.query;

    const query = { isActive: true };

    if (category) {
      query.category = category.toLowerCase();
    }

    if (city) {
      query['address.city'] = new RegExp(city, 'i');
    }

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Business.countDocuments(query);

    const businesses = await Business.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate('ownerId', 'name email');

    return res.status(200).json({
      success: true,
      count: businesses.length,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      businesses,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get detailed business profile with active services & hours
 * Public: GET /api/businesses/:id
 */
export const getBusinessById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const business = await Business.findById(id).populate('ownerId', 'name email phone');
    if (!business || !business.isActive) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Business not found',
          statusCode: 404,
        },
      });
    }

    // Load active services
    const services = await Service.find({ businessId: id, isActive: true });

    // Load working hours
    const workingHours = await WorkingHours.find({ businessId: id, staffId: null }).sort({
      dayOfWeek: 1,
    });

    // Load active staff members
    const staff = await Staff.find({ businessId: id, isActive: true })
      .populate('userId', 'name email phone')
      .populate('serviceIds', 'name durationMinutes price');

    return res.status(200).json({
      success: true,
      business,
      services,
      workingHours,
      staff,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated provider's business
 * Protected: GET /api/businesses/my/profile (Role: provider, admin)
 */
export const getMyBusiness = async (req, res, next) => {
  try {
    const ownerId = req.user._id;

    const business = await Business.findOne({ ownerId, isActive: true });
    if (!business) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No business profile found for this account. Please register your business first.',
          statusCode: 404,
        },
      });
    }

    // Load associated services, hours, and staff
    const [services, workingHours, staff] = await Promise.all([
      Service.find({ businessId: business._id, isActive: true }),
      WorkingHours.find({ businessId: business._id, staffId: null }).sort({ dayOfWeek: 1 }),
      Staff.find({ businessId: business._id, isActive: true })
        .populate('userId', 'name email phone')
        .populate('serviceIds', 'name durationMinutes price'),
    ]);

    return res.status(200).json({
      success: true,
      business,
      services,
      workingHours,
      staff,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update business profile
 * Protected: PATCH /api/businesses/:id (Role: provider, admin)
 */
export const updateBusiness = async (req, res, next) => {
  try {
    const { id } = req.params;

    const business = await Business.findById(id);
    if (!business) {
      return res.status(404).json({
        success: false,
        error: { message: 'Business not found', statusCode: 404 },
      });
    }

    // Authorization: Owner or platform admin only
    if (business.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied: You are not authorized to modify this business.',
          statusCode: 403,
        },
      });
    }

    // Prevent privilege escalation: only admin can modify verificationStatus directly or reactivate suspended business
    if (req.user.role !== 'admin') {
      delete req.body.verificationStatus;
      delete req.body.rejectionReason;
      delete req.body.suspensionReason;
      if (req.body.isActive !== undefined && !business.isActive) {
        delete req.body.isActive;
      }
    }

    Object.assign(business, req.body);
    await business.save();

    return res.status(200).json({
      success: true,
      message: 'Business profile updated successfully',
      business,
    });
  } catch (error) {
    next(error);
  }
};

