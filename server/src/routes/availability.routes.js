import { Router } from 'express';
import { getAvailability } from '../controllers/appointment.controller.js';
import {
  getProviderAvailability,
  toggleBookings,
  addHoliday,
  deleteHoliday,
  addClosedDate,
  deleteClosedDate,
  addBlockedSlot,
  deleteBlockedSlot,
  updateWorkingHoursSchedule,
} from '../controllers/availability.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// Provider Availability Management (Protected)
router.get('/provider', authenticate, authorize('provider', 'admin'), getProviderAvailability);
router.get('/provider/settings', authenticate, authorize('provider', 'admin'), getProviderAvailability);
router.patch('/provider/toggle-bookings', authenticate, authorize('provider', 'admin'), toggleBookings);
router.post('/provider/holidays', authenticate, authorize('provider', 'admin'), addHoliday);
router.delete('/provider/holidays/:id', authenticate, authorize('provider', 'admin'), deleteHoliday);
router.post('/provider/closed-dates', authenticate, authorize('provider', 'admin'), addClosedDate);
router.delete('/provider/closed-dates/:id', authenticate, authorize('provider', 'admin'), deleteClosedDate);
router.post('/provider/blocked-slots', authenticate, authorize('provider', 'admin'), addBlockedSlot);
router.delete('/provider/blocked-slots/:id', authenticate, authorize('provider', 'admin'), deleteBlockedSlot);
router.put('/provider/working-hours', authenticate, authorize('provider', 'admin'), updateWorkingHoursSchedule);
router.put('/provider/schedule', authenticate, authorize('provider', 'admin'), updateWorkingHoursSchedule);

// Public slot availability endpoint
router.get('/', getAvailability);

export default router;
