import { Router } from 'express';
import { checkHealth } from '../controllers/health.controller.js';

const router = Router();

// Route: GET /api/health
router.get('/', checkHealth);

export default router;

