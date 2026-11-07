import { Router } from 'express';
import {
  getProviderAnalytics,
  getAdminOverview,
  getAdminUserAnalytics,
  getAdminBusinessAnalytics,
  getAdminAppointmentAnalytics,
  getAdminRevenueAnalytics,
  getAdminBusinessPerformance,
  getAdminPopularServices,
} from '../controllers/analytics.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// Provider business analytics endpoints
router.get('/provider', authenticate, authorize('provider', 'admin'), getProviderAnalytics);
router.get('/overview', authenticate, authorize('provider', 'admin'), getProviderAnalytics);
router.get('/', authenticate, authorize('provider', 'admin'), getProviderAnalytics);

// Admin Platform Intelligence & Analytics (Role: admin only)
router.get('/admin/overview', authenticate, authorize('admin'), getAdminOverview);
router.get('/admin/users', authenticate, authorize('admin'), getAdminUserAnalytics);
router.get('/admin/businesses', authenticate, authorize('admin'), getAdminBusinessAnalytics);
router.get('/admin/appointments', authenticate, authorize('admin'), getAdminAppointmentAnalytics);
router.get('/admin/revenue', authenticate, authorize('admin'), getAdminRevenueAnalytics);
router.get('/admin/performance', authenticate, authorize('admin'), getAdminBusinessPerformance);
router.get('/admin/services', authenticate, authorize('admin'), getAdminPopularServices);
router.get('/admin', authenticate, authorize('admin'), getAdminOverview);

export default router;

