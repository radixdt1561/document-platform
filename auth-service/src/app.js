const express = require('express');
const cookieParser = require('cookie-parser');
const passport = require('./config/passport');
const { register, login, refresh, logout } = require('./controllers/auth.controller');
const { setupMFA, verifyMFA } = require('./controllers/mfa.controller');
const { googleCallback } = require('./controllers/oauth.controller');
const { validateRegisterInput } = require('./middlewares/validateUser');
const authenticate = require('./middlewares/auth.middleware');
const errorHandler = require('./middlewares/errorHandler');
const { helmetConfig, corsOptions, globalLimiter, authLimiter, hppProtect, attackDetection, noCache } = require('./middlewares/security');
const { csrfTokenHandler, csrfProtect } = require('./middlewares/csrf');
const { sanitizeInput } = require('./middlewares/sanitize');
const logger = require('./utils/logger');

const app = express();
app.use(helmetConfig);
app.use(corsOptions);
app.use(globalLimiter);
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(passport.initialize());
app.use(hppProtect);
app.use(sanitizeInput);
app.use(attackDetection);

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// Google OAuth routes — no CSRF (redirect-based flow)
app.get('/auth/google',
  authLimiter,
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);
app.get('/auth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth/login?error=oauth_failed' }),
  googleCallback
);

app.get('/auth/csrf-token', csrfTokenHandler);

app.post('/auth/register', authLimiter, csrfProtect, validateRegisterInput, register);
app.post('/auth/login',    authLimiter, csrfProtect, noCache, login);
app.post('/auth/refresh',  authLimiter, csrfProtect, noCache, refresh);
app.post('/auth/logout',   csrfProtect, logout);
app.get('/auth/mfa/setup',    authenticate, setupMFA);
app.post('/auth/mfa/verify',  authenticate, csrfProtect, verifyMFA);

app.use(errorHandler);

module.exports = app;
