const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
const { RefreshToken, Role } = require('../models');
const logger = require('../utils/logger');
const { maskEmail } = require('../utils/mask');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   true,
  sameSite: 'strict'
};

const googleCallback = async (req, res, next) => {
  try {
    const user = req.user;

    const roleRow  = await Role.findByPk(user.roleId);
    const roleName = roleRow?.name || 'USER';

    const accessToken  = generateAccessToken(user, roleName);
    const refreshToken = generateRefreshToken(user);

    await RefreshToken.create({
      token:     refreshToken,
      userId:    user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    logger.info('OAuth login success', { userId: user.id, email: maskEmail(user.email) });

    res
      .cookie('accessToken',  accessToken,  { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 })
      .cookie('refreshToken', refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/auth/refresh' })
      .redirect(process.env.OAUTH_SUCCESS_REDIRECT || '/');
  } catch (err) {
    next(err);
  }
};

module.exports = { googleCallback };
