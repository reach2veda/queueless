import jwt from 'jsonwebtoken';

/**
 * Generate a signed JSON Web Token (JWT)
 * @param {Object} user - User document
 * @returns {string} Signed JWT token
 */
export const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || 'queueless_jwt_secret_dev_key_2026';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    secret,
    { expiresIn }
  );
};

/**
 * Configure and attach an HTTP-only authentication cookie
 * @param {Response} res - Express response object
 * @param {string} token - Signed JWT
 */
export const setAuthCookie = (res, token) => {
  const cookieExpiresInDays = parseInt(process.env.JWT_COOKIE_EXPIRES_IN, 10) || 7;
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('token', token, {
    httpOnly: true, // Prevents client-side JS (XSS) from reading the cookie
    secure: isProduction, // Transmitted only over HTTPS in production
    sameSite: isProduction ? 'none' : 'lax', // CSRF protection
    maxAge: cookieExpiresInDays * 24 * 60 * 60 * 1000, // In milliseconds
  });
};

/**
 * Clear the authentication cookie (Logout)
 * @param {Response} res - Express response object
 */
export const clearAuthCookie = (res) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('token', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    expires: new Date(0), // Expire immediately
  });
};

