const crypto = require('crypto');

// Double-submit cookie pattern — no session required
// 1. GET /csrf-token  → sets __csrf cookie + returns token in body
// 2. State-changing requests must send matching X-CSRF-Token header

const CSRF_COOKIE = '__csrf';
const CSRF_HEADER = 'x-csrf-token';

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Route handler: GET /csrf-token
const csrfTokenHandler = (req, res) => {
  const token = generateToken();
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,   // JS must read this to send in header
    secure: true,
    sameSite: 'strict'
  });
  res.json({ csrfToken: token });
};

// Middleware: validate CSRF on mutating requests
const csrfProtect = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers?.[CSRF_HEADER];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ success: false, message: 'Invalid CSRF token' });
  }
  next();
};

module.exports = { csrfTokenHandler, csrfProtect };
