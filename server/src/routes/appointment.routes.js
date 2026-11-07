import { Router } from 'express';
import {
  createAppointment,
  getMyAppointments,
  getAppointmentById,
  cancelAppointment,
  rescheduleAppointment,
  getAvailability,
  getProviderAppointments,
  assignStaffToAppointment,
} from '../controllers/appointment.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../validators/auth.validator.js';
import {
  createAppointmentSchema,
  cancelAppointmentSchema,
  rescheduleAppointmentSchema,
} from '../validators/appointment.validator.js';

const router = Router();

// Provider & Staff appointments overview
router.get('/business/all', authenticate, authorize('provider', 'staff', 'admin'), getProviderAppointments);

// Customer appointments (Protected)
router.get('/my', authenticate, getMyAppointments);
router.get('/availability', getAvailability);
router.get('/:id', authenticate, getAppointmentById);
router.post('/', authenticate, validate(createAppointmentSchema), createAppointment);
router.patch('/:id/assign-staff', authenticate, authorize('provider', 'staff', 'admin'), assignStaffToAppointment);
router.patch('/:id/cancel', authenticate, validate(cancelAppointmentSchema), cancelAppointment);
router.patch('/:id/reschedule', authenticate, validate(rescheduleAppointmentSchema), rescheduleAppointment);

export default router;

