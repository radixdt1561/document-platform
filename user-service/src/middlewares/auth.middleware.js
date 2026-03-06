const { verifyToken } = require('../utils/jwt');

const authenticate = (req, res, next) => {
  try {
    const token = req.cookies?.accessToken || req.headers?.authorization?.split(' ')[1];
    if (!token) throw new Error('Unauthorized');
    req.user = verifyToken(token);
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
};

module.exports = authenticate;
