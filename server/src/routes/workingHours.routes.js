import { Router } from 'express';
import {
  setWorkingHours,
  getWorkingHours,
} from '../controllers/workingHours.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../validators/auth.validator.js';
import { setWorkingHoursSchema } from '../validators/business.validator.js';

const router = Router();

// Public listing
router.get('/', getWorkingHours);

// Protected routes (Provider / Admin)
router.post(
  '/',
  authenticate,
  authorize('provider', 'admin'),
  validate(setWorkingHoursSchema),
  setWorkingHours
);

export default router;

