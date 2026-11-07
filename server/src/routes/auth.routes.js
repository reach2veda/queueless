import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout, getMe, demoLogin, updateProfile } from '../controllers/auth.controller.js';
import { validate, registerSchema, loginSchema, updateProfileSchema } from '../validators/auth.validator.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

const isProduction = process.env.NODE_ENV === 'production';

// Authentication rate limiter protecting against brute-force and credential-stuffing attacks
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute sliding window
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 50, // 50 attempts per window per IP
  standardHeaders: true, // Return RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  statusCode: 429,
  keyGenerator: (req) => {
    // In production, strictly bind to Express's validated client IP (preventing header spoofing)
    if (isProduction) {
      return req.ip || '127.0.0.1';
    }
    // In local development or test runs only, allow test runners to isolate client IDs
    return req.headers['x-test-client-id'] || req.ip || '127.0.0.1';
  },
  skip: (req) => {
    // In production, NEVER allow header-based bypass. All clients are strictly throttled.
    if (isProduction) {
      return false;
    }
    // In local development or test suites only, allow regression test suite to bypass lockout
    return req.headers['x-regression-test'] === 'true';
  },
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      error: {
        message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
        statusCode: 429,
      },
    });
  },
});

// Public routes with authentication rate limiting
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/demo-login', authLimiter, demoLogin);
router.post('/logout', logout);

// Protected routes (no rate-limit on standard session queries)
router.get('/me', authenticate, getMe);
router.patch('/profile', authenticate, validate(updateProfileSchema), updateProfile);

export default router;

