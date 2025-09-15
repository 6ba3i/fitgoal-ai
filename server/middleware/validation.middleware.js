const { validationResult } = require('express-validator');

class ValidationMiddleware {
  handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg
        }))
      });
    }
    
    next();
  }

  sanitizeInput(req, res, next) {
    // Remove any potential XSS attempts
    const sanitize = (obj) => {
      for (let key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = obj[key].trim();
          // Remove script tags and other potential XSS
          obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitize(obj[key]);
        }
      }
    };

    if (req.body) sanitize(req.body);
    if (req.query) sanitize(req.query);
    if (req.params) sanitize(req.params);

    next();
  }
}

module.exports = new ValidationMiddleware();