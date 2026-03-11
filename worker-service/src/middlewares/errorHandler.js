const logger = require('../utils/logger');

const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || err.status || 500;
  const isOperational = err.isOperational || false;

  logger.error(err.message, {
    statusCode,
    method: req.method,
    path: req.path,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });

  res.status(statusCode).json({
    success: false,
    statusCode,
    message: isOperational ? err.message : 'Internal Server Error'
  });
};

module.exports = errorHandler;
