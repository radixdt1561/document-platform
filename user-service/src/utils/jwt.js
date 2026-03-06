const jwt = require('jsonwebtoken');

const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

module.exports = { verifyToken };
