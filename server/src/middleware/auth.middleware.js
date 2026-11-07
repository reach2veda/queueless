import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/user.model.js';

/**
 * Authentication Middleware
 * Validates JWT from HTTP-only cookie or Authorization header.
 * Attaches the authenticated user to `req.user`.
 */
export const authenticate = async (req, res, next) => {
  let token = req.cookies?.token;

  // Fallback to Bearer token in Authorization header
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required. Please log in.',
        statusCode: 401,
      },
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'queueless_jwt_secret_dev_key_2026';
    const decoded = jwt.verify(token, secret);

    // If MongoDB is connected, load the fresh user document
    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'User belonging to this token no longer exists.',
            statusCode: 401,
          },
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Your account has been deactivated. Please contact support.',
            statusCode: 403,
          },
        });
      }

      req.user = user;
    } else {
      // Degraded / DB pending fallback
      req.user = {
        _id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        isActive: true,
      };
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        message: error.name === 'TokenExpiredError' ? 'Session expired. Please log in again.' : 'Invalid token.',
        statusCode: 401,
      },
    });
  }
};

/**
 * Role-Based Authorization Middleware
 * Enforces that only users with specific roles can access the endpoint.
 * @param  {...string} roles - e.g. 'admin', 'provider', 'staff'
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required before authorization check.',
          statusCode: 401,
        },
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: `Access denied. Role "${req.user.role}" does not have permission to perform this action.`,
          statusCode: 403,
        },
      });
    }

    next();
  };
};

