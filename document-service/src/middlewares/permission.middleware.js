const { Role, Permission } = require('../models');

const METHOD_PERMISSION_MAP = {
  GET: 'READ_DOCUMENT', POST: 'CREATE_DOCUMENT',
  PUT: 'UPDATE_DOCUMENT', PATCH: 'UPDATE_DOCUMENT', DELETE: 'DELETE_DOCUMENT'
};

const authorizePermission = async (req, res, next) => {
  try {
    const userRole = req.user?.role;
    if (!userRole) return res.status(401).json({ message: 'Unauthorized: role not found in token' });

    const requiredPermission = METHOD_PERMISSION_MAP[req.method];
    if (!requiredPermission) return res.status(405).json({ message: `Method ${req.method} not allowed` });

    const role = await Role.findOne({ where: { name: userRole }, include: [{ model: Permission }] });
    if (!role) return res.status(403).json({ message: `Forbidden: role "${userRole}" does not exist` });
    if (!role.Permissions?.some((p) => p.name === requiredPermission))
      return res.status(403).json({ message: `Permission denied: "${requiredPermission}" required` });

    next();
  } catch (error) { next(error); }
};

module.exports = authorizePermission;
