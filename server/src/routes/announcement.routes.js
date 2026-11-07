import { Router } from 'express';
import {
  createAnnouncement,
  getMyAnnouncements,
  getActiveAnnouncementsByBusiness,
  updateAnnouncement,
  togglePublishAnnouncement,
  deleteAnnouncement,
} from '../controllers/announcement.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// Public customer endpoint: Active announcements for a clinic
router.get('/business/:businessId', getActiveAnnouncementsByBusiness);

// Protected provider endpoints
router.get('/my', authenticate, authorize('provider', 'admin'), getMyAnnouncements);
router.post('/', authenticate, authorize('provider', 'admin'), createAnnouncement);
router.patch('/:id/publish', authenticate, authorize('provider', 'admin'), togglePublishAnnouncement);
router.patch('/:id', authenticate, authorize('provider', 'admin'), updateAnnouncement);
router.delete('/:id', authenticate, authorize('provider', 'admin'), deleteAnnouncement);

export default router;

