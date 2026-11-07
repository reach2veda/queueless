/**
 * 404 Not Found Middleware
 * Intercepts requests that do not match any defined API routes.
 */
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Resource not found - ${req.originalUrl}`,
      statusCode: 404,
    },
  });
};

