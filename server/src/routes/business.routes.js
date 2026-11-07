import { Router } from 'express';
import {
  createBusiness,
  getBusinesses,
  getBusinessById,
  getMyBusiness,
  updateBusiness,
} from '../controllers/business.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../validators/auth.validator.js';
import {
  createBusinessSchema,
  updateBusinessSchema,
} from '../validators/business.validator.js';

const router = Router();

// Public routes
router.get('/', getBusinesses);
router.get('/my/profile', authenticate, authorize('provider', 'admin'), getMyBusiness);
router.get('/my/business', authenticate, authorize('provider', 'admin'), getMyBusiness);
router.get('/:id', getBusinessById);

// Protected routes (Provider / Admin)
router.post(
  '/',
  authenticate,
  authorize('provider', 'admin'),
  validate(createBusinessSchema),
  createBusiness
);

router.patch(
  '/:id',
  authenticate,
  authorize('provider', 'admin'),
  validate(updateBusinessSchema),
  updateBusiness
);

export default router;

