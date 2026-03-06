const express = require('express');
const { getUserAnalytics } = require('./controllers/analytics.controller');
const errorHandler = require('./middlewares/errorHandler');
const { helmetConfig, corsOptions, globalLimiter, hppProtect, attackDetection } = require('./middlewares/security');
const { sanitizeInput } = require('./middlewares/sanitize');
const logger = require('./utils/logger');

const app = express();
app.use(helmetConfig);
app.use(corsOptions);
app.use(globalLimiter);
app.use(express.json({ limit: '10kb' }));
app.use(hppProtect);
app.use(sanitizeInput);
app.use(attackDetection);

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

app.get('/analytics/users', getUserAnalytics);

app.use(errorHandler);

module.exports = app;
