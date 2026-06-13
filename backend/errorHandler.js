// middleware/errorHandler.js

// ── Custom error class ────────────────────────────────────────
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ── Global error handler middleware ───────────────────────────
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.error('\n🔴 ERROR:', err);
  }

  // Mongoose: bad ObjectId
  if (err.name === 'CastError') {
    error = new AppError(`Resource not found (invalid id: ${err.value})`, 404);
  }

  // Mongoose: duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    error = new AppError(
      `Duplicate value: '${value}' for field '${field}' already exists`,
      400
    );
  }

  // Mongoose: validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    error = new AppError(messages.join('. '), 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token — please log in again', 401);
  }
  if (err.name === 'TokenExpiredError') {
    error = new AppError('Token expired — please log in again', 401);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { errorHandler, AppError };