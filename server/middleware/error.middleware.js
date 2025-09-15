class ErrorMiddleware {
  notFound(req, res, next) {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
  }

  errorHandler(err, req, res, next) {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message;

    // Mongoose bad ObjectId
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
      statusCode = 404;
      message = 'Resource not found';
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
      statusCode = 400;
      message = 'Duplicate field value entered';
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
      statusCode = 400;
      message = Object.values(err.errors).map(e => e.message).join(', ');
    }

    res.status(statusCode).json({
      success: false,
      message,
      stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
  }

  asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}

module.exports = new ErrorMiddleware();