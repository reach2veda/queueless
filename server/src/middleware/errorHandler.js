/**
 * Global Centralized Error Handling Middleware
 * Ensures every unhandled error returns a clean, predictable JSON response.
 * Never leaks sensitive stack traces to users in production.
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);

  const response = {
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  };

  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message);
  res.status(statusCode).json(response);
};

