import { Router } from 'express';
import {
  getAdminStats,
  getAllAppointments,
  updateAppointmentStatus,
  approveAppointment,
  rejectAppointment,
  completeAppointment,
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  getAllBusinesses,
  getBusinessById,
  approveBusiness,
  rejectBusiness,
  updateBusinessStatus,
  suspendBusiness,
  reactivateBusiness,
  getAllAuditLogs,
  getAdminLogById,
  getAdminLogStats,
} from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// Enforce authentication AND admin role on all /api/admin endpoints
router.use(authenticate, authorize('admin'));

// Admin Dashboard KPI Stats
router.get('/stats', getAdminStats);

// User Directory Management
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/status', updateUserStatus);
router.patch('/users/:id/role', updateUserRole);

// Business Directory & Verification Management
router.get('/businesses', getAllBusinesses);
router.get('/businesses/:id', getBusinessById);
router.patch('/businesses/:id/approve', approveBusiness);
router.patch('/businesses/:id/reject', rejectBusiness);
router.patch('/businesses/:id/status', updateBusinessStatus);
router.patch('/businesses/:id/suspend', suspendBusiness);
router.patch('/businesses/:id/reactivate', reactivateBusiness);

// Appointment Management
router.get('/appointments', getAllAppointments);
router.patch('/appointments/:id/status', updateAppointmentStatus);
router.patch('/appointments/:id/approve', approveAppointment);
router.patch('/appointments/:id/reject', rejectAppointment);
router.patch('/appointments/:id/complete', completeAppointment);

// Security & Activity Audit Logs (Read-only, Immutable)
router.get('/logs', getAllAuditLogs);
router.get('/logs/stats', getAdminLogStats);
router.get('/logs/:id', getAdminLogById);

export default router;

