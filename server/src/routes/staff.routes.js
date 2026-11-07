import { Router } from 'express';
import {
  addStaff,
  getStaffByBusiness,
  getMyStaff,
  getStaffSchedule,
  getStaffHistory,
  updateStaff,
  toggleStaffStatus,
  removeStaff,
} from '../controllers/staff.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../validators/auth.validator.js';
import { addStaffSchema, updateStaffSchema } from '../validators/business.validator.js';

const router = Router();

// Staff's own schedule and roster (Protected: staff, provider, admin)
router.get('/schedule', authenticate, authorize('staff', 'provider', 'admin'), getStaffSchedule);

// Staff's completed service history & counter logs (Protected: staff, provider, admin)
router.get('/history', authenticate, authorize('staff', 'provider', 'admin'), getStaffHistory);

// Provider's own staff list (Protected)
router.get('/my', authenticate, authorize('provider', 'admin'), getMyStaff);

// Public / booking listing
router.get('/', getStaffByBusiness);

// Protected routes (Provider / Admin)
router.post('/', authenticate, authorize('provider', 'admin'), addStaff);
router.patch('/:id/toggle-status', authenticate, authorize('provider', 'admin'), toggleStaffStatus);
router.patch('/:id', authenticate, authorize('provider', 'admin'), updateStaff);
router.delete('/:id', authenticate, authorize('provider', 'admin'), removeStaff);

export default router;

