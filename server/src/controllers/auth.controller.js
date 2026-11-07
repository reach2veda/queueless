import mongoose from 'mongoose';
import User from '../models/user.model.js';
import { generateToken, setAuthCookie, clearAuthCookie } from '../utils/token.js';
import { logAuditEvent } from '../utils/auditLogger.js';

/**
 * Register a new user (Customer or Service Provider)
 * Public endpoint: POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: {
          message: 'Database connection is pending. Please configure MONGODB_URI in server/.env to enable live persistence.',
          statusCode: 503,
        },
      });
    }

    const { name, email, password, confirmPassword, phone, role, businessName, businessCategory } = req.body;

    // Validate confirmPassword
    if (!confirmPassword) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Confirm password is required',
          statusCode: 400,
        },
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Passwords do not match.',
          statusCode: 400,
        },
      });
    }

    // Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'An account with this email address already exists.',
          statusCode: 409,
        },
      });
    }

    // Create user (passwordHash is automatically hashed by pre-save hook)
    const user = new User({
      name,
      email,
      passwordHash: password,
      phone: phone || '',
      role: role || 'customer',
    });

    await user.save();

    // Generate JWT and set HTTP-only cookie
    const token = generateToken(user);
    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: user.toJSON(),
      token, // Also returned for mobile/API clients
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Log in an existing user
 * Public endpoint: POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: {
          message: 'Database connection is pending. Please configure MONGODB_URI in server/.env to authenticate against stored credentials.',
          statusCode: 503,
        },
      });
    }

    const { email, password } = req.body;

    // Explicitly select passwordHash since it is excluded by default in schema
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      await logAuditEvent({
        req,
        action: 'AUTH_LOGIN_FAILED',
        actionCategory: 'SECURITY',
        description: `Failed login attempt for unknown account "${email}".`,
        resourceType: 'Auth',
        resourceName: email,
        status: 'failure',
        severity: 'warning',
        metadata: { email },
      });
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password.',
          statusCode: 401,
        },
      });
    }

    if (!user.isActive) {
      await logAuditEvent({
        req,
        actor: user,
        action: 'AUTH_LOGIN_BLOCKED',
        actionCategory: 'SECURITY',
        description: `Blocked login attempt for suspended account "${user.email}".`,
        resourceType: 'User',
        resourceId: user._id,
        resourceName: user.name,
        status: 'blocked',
        severity: 'warning',
      });
      return res.status(403).json({
        success: false,
        error: {
          message: 'Your account is suspended. Please contact platform administration.',
          statusCode: 403,
        },
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await logAuditEvent({
        req,
        actor: user,
        action: 'AUTH_LOGIN_FAILED',
        actionCategory: 'SECURITY',
        description: `Failed login attempt (incorrect password) for account "${email}".`,
        resourceType: 'User',
        resourceId: user._id,
        resourceName: user.name,
        status: 'failure',
        severity: 'warning',
        metadata: { email },
      });
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password.',
          statusCode: 401,
        },
      });
    }

    // Update last login timestamp without re-hashing password
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate token & set cookie
    const token = generateToken(user);
    setAuthCookie(res, token);

    await logAuditEvent({
      req,
      actor: user,
      action: user.role === 'admin' ? 'ADMIN_LOGIN' : 'USER_LOGIN',
      actionCategory: 'AUTH',
      description: `${user.role === 'admin' ? 'Administrator' : 'User'} "${user.name}" authenticated successfully.`,
      resourceType: 'User',
      resourceId: user._id,
      resourceName: user.name,
      status: 'success',
      severity: 'info',
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: user.toJSON(),
      token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Demo Login Endpoint
 * Public: POST /api/auth/demo-login
 * Body: { role: 'provider' | 'customer' }
 */
export const demoLogin = async (req, res, next) => {
  try {
    const { role = 'provider' } = req.body;

    // Only allow safe demo roles (do NOT allow admin demo login)
    if (!['provider', 'customer'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid demo role requested. Allowed demo roles: "provider", "customer".',
          statusCode: 400,
        },
      });
    }

    const demoEmail = role === 'provider' ? 'provider@queueless.com' : 'customer@queueless.com';

    let user = await User.findOne({ email: demoEmail, role });

    if (!user && role === 'provider') {
      const { ensureDemoProvider } = await import('../utils/ensureDemoProvider.js');
      user = await ensureDemoProvider();
    }

    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        error: {
          message: `The ${role} demo account is currently unavailable. Please register or contact support.`,
          statusCode: 404,
        },
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate real JWT token signed with server secret
    const token = generateToken(user);
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} demo authenticated successfully`,
      user: user.toJSON(),
      token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Log out user by clearing the authentication cookie
 * Public endpoint: POST /api/auth/logout
 */
export const logout = async (req, res) => {
  if (req.user) {
    await logAuditEvent({
      req,
      actor: req.user,
      action: req.user.role === 'admin' ? 'ADMIN_LOGOUT' : 'USER_LOGOUT',
      actionCategory: 'AUTH',
      description: `User "${req.user.name}" logged out.`,
      resourceType: 'User',
      resourceId: req.user._id,
      resourceName: req.user.name,
      status: 'success',
      severity: 'info',
    });
  }
  clearAuthCookie(res);
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

/**
 * Retrieve current authenticated user profile
 * Protected endpoint: GET /api/auth/me
 */
export const getMe = async (req, res) => {
  const user = req.user?.toJSON ? req.user.toJSON() : req.user;
  return res.status(200).json({
    success: true,
    user,
  });
};

/**
 * Update current authenticated user profile
 * Protected endpoint: PATCH /api/auth/profile
 * Strictly uses authenticated JWT session ID (req.user._id)
 */
export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required. Invalid session.', statusCode: 401 },
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User account not found', statusCode: 404 },
      });
    }

    const { name, phone, avatarUrl } = req.body;

    // Apply sanitized updates for allowed profile fields only
    if (name !== undefined && name !== null) {
      user.name = String(name).trim();
    }
    if (phone !== undefined && phone !== null) {
      user.phone = String(phone).trim();
    }
    if (avatarUrl !== undefined && avatarUrl !== null) {
      user.avatarUrl = String(avatarUrl).trim();
    }

    // Save permanently in MongoDB with full validation enabled
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

