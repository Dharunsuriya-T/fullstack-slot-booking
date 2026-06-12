const { AppError } = require('../utils/appError');

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log all errors (excluding 4xx client errors in production if desired, but good for debugging)
  if (err.statusCode >= 500) {
    console.error(`[SERVER_ERROR] ${req.method} ${req.originalUrl}`, err);
  } else {
    console.warn(`[CLIENT_ERROR] ${req.method} ${req.originalUrl} - Status: ${err.statusCode} - Message: ${err.message}`);
  }

  // Handle express JSON body parser syntax error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      status: 'fail',
      error: 'Invalid JSON payload'
    });
  }

  // Handle Zod Validation errors if they propagate
  if (err.name === 'ZodError') {
    const message = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    return res.status(400).json({
      status: 'fail',
      error: message
    });
  }

  // If in production mode, hide raw system/db details
  if (process.env.NODE_ENV === 'production') {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        error: err.message
      });
    }

    // Programming or unknown errors: don't leak details to the client
    return res.status(500).json({
      status: 'error',
      error: 'Something went wrong on our end'
    });
  }

  // In development, return full trace
  return res.status(err.statusCode).json({
    status: err.status,
    error: err.message,
    stack: err.stack,
    details: err
  });
};

module.exports = errorHandler;
