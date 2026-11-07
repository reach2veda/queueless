import { Router } from 'express';
import {
  createService,
  getMyServices,
  getServicesByBusiness,
  getServiceById,
  updateService,
  deleteService,
} from '../controllers/service.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../validators/auth.validator.js';
import {
  createServiceSchema,
  updateServiceSchema,
} from '../validators/business.validator.js';

const router = Router();

// Provider's own services catalog (must be before /:id)
router.get('/my', authenticate, authorize('provider', 'admin'), getMyServices);

// Public routes
router.get('/', getServicesByBusiness);
router.get('/:id', getServiceById);

// Protected routes (Provider / Admin)
router.post(
  '/',
  authenticate,
  authorize('provider', 'admin'),
  validate(createServiceSchema),
  createService
);

router.patch(
  '/:id',
  authenticate,
  authorize('provider', 'admin'),
  validate(updateServiceSchema),
  updateService
);

router.delete('/:id', authenticate, authorize('provider', 'admin'), deleteService);

export default router;

