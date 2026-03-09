const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  try {
    const token = req.cookies?.accessToken || req.headers?.authorization?.split(' ')[1];
    if (!token) throw new Error('Unauthorized');
    req.user = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'document-platform',
      audience: 'api'
    });
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
};

module.exports = authenticate;
