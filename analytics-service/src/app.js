const express = require('express');
const cookieParser = require('cookie-parser');
const { getUserAnalytics } = require('./controllers/analytics.controller');
const authenticate = require('./middlewares/auth.middleware');
const errorHandler = require('./middlewares/errorHandler');
const { helmetConfig, corsOptions, globalLimiter, hppProtect, attackDetection } = require('./middlewares/security');
const { sanitizeInput } = require('./middlewares/sanitize');
const logger = require('./utils/logger');

const app = express();
app.use(helmetConfig);
app.use(corsOptions);
app.use(globalLimiter);
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(hppProtect);
app.use(sanitizeInput);
app.use(attackDetection);

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// ADMIN-only: only users with role ADMIN can view analytics
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'ADMIN')
    return res.status(403).json({ message: 'Forbidden: ADMIN role required' });
  next();
};

app.get('/analytics/users', authenticate, requireAdmin, getUserAnalytics);

app.use(errorHandler);

module.exports = app;
