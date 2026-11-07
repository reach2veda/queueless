import { Router } from 'express';
import {
  getMyActiveTicket,
  getAdminLiveQueue,
  adminCallNext,
  adminMarkServing,
  adminMarkCompleted,
  adminSkipToken,
  adminCancelToken,
  joinQueue,
  checkInAppointment,
} from '../controllers/queue.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// ================= CUSTOMER QUEUE ROUTES =================
// Normal users can only access their own active ticket pass
router.get('/my/ticket', authenticate, getMyActiveTicket);
router.post('/join', authenticate, joinQueue);
router.post('/check-in', authenticate, checkInAppointment);

// ================= ADMIN QUEUE OPERATOR ROUTES =================
// Only admins can control the queue terminal and change token states
router.get('/admin/live', authenticate, authorize('admin', 'provider', 'staff'), getAdminLiveQueue);
router.post('/admin/call-next', authenticate, authorize('admin', 'provider', 'staff'), adminCallNext);
router.patch('/admin/tokens/:id/serve', authenticate, authorize('admin', 'provider', 'staff'), adminMarkServing);
router.patch('/admin/tokens/:id/complete', authenticate, authorize('admin', 'provider', 'staff'), adminMarkCompleted);
router.patch('/admin/tokens/:id/skip', authenticate, authorize('admin', 'provider', 'staff'), adminSkipToken);
router.patch('/admin/tokens/:id/cancel', authenticate, authorize('admin', 'provider', 'staff'), adminCancelToken);

export default router;

