const helmet     = require('helmet');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const hpp        = require('hpp');

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

// ─── Helmet: full OWASP security headers ────────────────────────────────────
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'"],
      styleSrc:       ["'self'"],
      imgSrc:         ["'self'", 'data:'],
      connectSrc:     ["'self'"],
      fontSrc:        ["'self'"],
      objectSrc:      ["'none'"],
      frameSrc:       ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  hsts:                  { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy:        { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy:   { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  noSniff:    true,   // X-Content-Type-Options: nosniff
  xssFilter:  true,   // X-XSS-Protection
  frameguard: { action: 'deny' }
});

// ─── CORS ────────────────────────────────────────────────────────────────────
const corsOptions = cors({
  origin: (origin, cb) =>
    (!origin || ALLOWED_ORIGINS.includes(origin)) ? cb(null, true) : cb(new Error(`CORS blocked: ${origin}`)),
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-Response-Time'],
  maxAge:         86400
});

// ─── Rate limiters ───────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 200,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, please try again later.' }
});

// strict per-IP limiter for sensitive write operations
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 10,  // 10 req/hr per IP
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Rate limit exceeded.' }
});

// ─── HTTP Parameter Pollution protection ─────────────────────────────────────
const hppProtect = hpp({
  whitelist: ['sort', 'fields', 'page', 'limit']  // allow these to be arrays
});

// ─── Suspicious request pattern detection (OWASP A03 injection probing) ──────
const ATTACK_PATTERNS = [
  /(\bSELECT\b|\bUNION\b|\bDROP\b|\bINSERT\b|\bDELETE\b|\bUPDATE\b)/i,  // SQLi
  /<script[\s\S]*?>[\s\S]*?<\/script>/i,                                    // XSS
  /\.\.\//,                                                                  // path traversal
  /\$\{.*\}/,                                                                // template injection
  /\$where|\$gt|\$lt|\$ne|\$in/                                              // NoSQL injection
];

const attackDetection = (req, res, next) => {
  const payload = JSON.stringify({ ...req.body, ...req.query, ...req.params });
  if (ATTACK_PATTERNS.some((p) => p.test(payload))) {
    return res.status(400).json({ success: false, message: 'Invalid request.' });
  }
  next();
};

// ─── Cache-Control for sensitive routes ──────────────────────────────────────
const noCache = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  next();
};

module.exports = {
  helmetConfig, corsOptions,
  globalLimiter, authLimiter, strictLimiter,
  hppProtect, attackDetection, noCache
};
