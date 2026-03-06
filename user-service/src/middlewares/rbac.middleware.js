const authorize = (...allowedRoles) => (req, res, next) => {
  try {
    if (!allowedRoles.includes(req.user.role))
      return res.status(403).json({ message: 'Forbidden: Access denied' });
    next();
  } catch (error) { next(error); }
};

module.exports = authorize;
