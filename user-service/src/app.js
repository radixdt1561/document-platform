const express = require('express');
const cookieParser = require('cookie-parser');
const authenticate = require('./middlewares/auth.middleware');
const authorize = require('./middlewares/rbac.middleware');
const errorHandler = require('./middlewares/errorHandler');
const { helmetConfig, corsOptions, globalLimiter, hppProtect, attackDetection } = require('./middlewares/security');
const { sanitizeInput } = require('./middlewares/sanitize');
const cache = require('./utils/cache');
const logger = require('./utils/logger');
const { maskUser } = require('./utils/mask');

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

app.get('/users/profile', authenticate, async (req, res, next) => {
  try {
    const cacheKey = `profile:${req.user.id}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const response = { message: 'Protected route accessed', user: maskUser(req.user) };
    await cache.set(cacheKey, response, 300);
    res.json(response);
  } catch (error) { next(error); }
});

app.get('/users/admin/dashboard', authenticate, authorize('ADMIN'), (req, res) => {
  res.json({ message: 'Welcome Admin 🚀' });
});

app.use(errorHandler);

module.exports = app;
