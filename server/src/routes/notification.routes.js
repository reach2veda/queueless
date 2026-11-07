import { Router } from 'express';
import {
  getMyNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

router.get('/my', getMyNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/:id/read', markNotificationAsRead);
router.patch('/mark-all-read', markAllNotificationsAsRead);

export default router;

