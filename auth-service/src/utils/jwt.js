const jwt = require('jsonwebtoken');

const ACCESS_OPTIONS  = { expiresIn: '15m', algorithm: 'HS256', issuer: 'document-platform', audience: 'api' };
const REFRESH_OPTIONS = { expiresIn: '7d',  algorithm: 'HS256', issuer: 'document-platform', audience: 'refresh' };
const VERIFY_OPTIONS  = (audience) => ({ algorithms: ['HS256'], issuer: 'document-platform', audience });

const generateAccessToken  = (user, roleName) =>
  jwt.sign({ id: user.id, role: roleName }, process.env.JWT_SECRET, ACCESS_OPTIONS);

const generateRefreshToken = (user) =>
  jwt.sign({ id: user.id }, process.env.REFRESH_TOKEN_SECRET, REFRESH_OPTIONS);

const verifyToken        = (token) => jwt.verify(token, process.env.JWT_SECRET,         VERIFY_OPTIONS('api'));
const verifyRefreshToken = (token) => jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, VERIFY_OPTIONS('refresh'));

module.exports = { generateAccessToken, generateRefreshToken, verifyToken, verifyRefreshToken };
