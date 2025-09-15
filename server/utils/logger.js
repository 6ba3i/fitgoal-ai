const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.ensureLogDirectory();
    this.colors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m'
    };
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = this.getTimestamp();
    const metaString = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
    return `[${timestamp}] [${level}] ${message} ${metaString}`.trim();
  }

  writeToFile(level, message, meta) {
    const date = new Date().toISOString().split('T')[0];
    const filename = path.join(this.logDir, `${date}.log`);
    const logMessage = this.formatMessage(level, message, meta) + '\n';
    
    fs.appendFile(filename, logMessage, (err) => {
      if (err) {
        console.error('Failed to write to log file:', err);
      }
    });
  }

  log(level, message, meta = {}) {
    const formattedMessage = this.formatMessage(level, message, meta);
    
    // Write to file
    if (process.env.NODE_ENV === 'production') {
      this.writeToFile(level, message, meta);
    }
    
    // Console output with colors
    let color = this.colors.white;
    let consoleMethod = console.log;
    
    switch (level) {
      case 'ERROR':
        color = this.colors.red;
        consoleMethod = console.error;
        break;
      case 'WARN':
        color = this.colors.yellow;
        consoleMethod = console.warn;
        break;
      case 'INFO':
        color = this.colors.cyan;
        break;
      case 'SUCCESS':
        color = this.colors.green;
        break;
      case 'DEBUG':
        color = this.colors.magenta;
        break;
    }
    
    if (process.env.NODE_ENV !== 'test') {
      consoleMethod(`${color}${formattedMessage}${this.colors.reset}`);
    }
  }

  info(message, meta) {
    this.log('INFO', message, meta);
  }

  error(message, meta) {
    this.log('ERROR', message, meta);
  }

  warn(message, meta) {
    this.log('WARN', message, meta);
  }

  success(message, meta) {
    this.log('SUCCESS', message, meta);
  }

  debug(message, meta) {
    if (process.env.NODE_ENV === 'development') {
      this.log('DEBUG', message, meta);
    }
  }

  // HTTP request logger
  httpLogger() {
    return (req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
          method: req.method,
          url: req.originalUrl,
          status: res.statusCode,
          duration: `${duration}ms`,
          ip: req.ip,
          userAgent: req.get('user-agent')
        };
        
        if (res.statusCode >= 400) {
          this.error(`HTTP ${req.method} ${req.originalUrl}`, logData);
        } else {
          this.info(`HTTP ${req.method} ${req.originalUrl}`, logData);
        }
      });
      
      next();
    };
  }

  // Database query logger
  dbLogger(operation, collection, query = {}, duration = null) {
    const logData = {
      operation,
      collection,
      query: JSON.stringify(query),
      duration: duration ? `${duration}ms` : 'N/A'
    };
    
    this.debug(`Database ${operation} on ${collection}`, logData);
  }

  // API call logger
  apiLogger(service, endpoint, method, status, duration) {
    const logData = {
      service,
      endpoint,
      method,
      status,
      duration: `${duration}ms`
    };
    
    if (status >= 400) {
      this.error(`External API call to ${service}`, logData);
    } else {
      this.info(`External API call to ${service}`, logData);
    }
  }

  // Error logger with stack trace
  logError(error, context = '') {
    const errorData = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: this.getTimestamp()
    };
    
    this.error(`Error in ${context}`, errorData);
    
    // In production, you might want to send this to an error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Send to error tracking service (e.g., Sentry, Rollbar)
      this.sendToErrorTracking(errorData);
    }
  }

  // Send errors to external tracking service
  sendToErrorTracking(errorData) {
    // Implement integration with error tracking service
    // Example: Sentry, Rollbar, etc.
  }

  // Performance logger
  startTimer(label) {
    return {
      label,
      start: Date.now()
    };
  }

  endTimer(timer) {
    const duration = Date.now() - timer.start;
    this.debug(`Performance: ${timer.label}`, { duration: `${duration}ms` });
    return duration;
  }

  // Audit logger for important actions
  audit(userId, action, details = {}) {
    const auditData = {
      userId,
      action,
      details,
      timestamp: this.getTimestamp()
    };
    
    const auditFile = path.join(this.logDir, 'audit.log');
    const logMessage = JSON.stringify(auditData) + '\n';
    
    fs.appendFile(auditFile, logMessage, (err) => {
      if (err) {
        console.error('Failed to write to audit log:', err);
      }
    });
    
    this.info(`AUDIT: ${action} by user ${userId}`, details);
  }

  // Clean old log files
  cleanOldLogs(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    fs.readdir(this.logDir, (err, files) => {
      if (err) {
        console.error('Failed to read log directory:', err);
        return;
      }
      
      files.forEach(file => {
        const filePath = path.join(this.logDir, file);
        fs.stat(filePath, (err, stats) => {
          if (err) return;
          
          if (stats.mtime < cutoffDate) {
            fs.unlink(filePath, (err) => {
              if (err) {
                console.error(`Failed to delete old log file ${file}:`, err);
              } else {
                this.info(`Deleted old log file: ${file}`);
              }
            });
          }
        });
      });
    });
  }
}

// Export singleton instance
module.exports = new Logger();