const { User, Role, RefreshToken, Profile, sequelize } = require('../models');
const { comparePassword } = require('../utils/hash');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { maskEmail, maskUser } = require('../utils/mask');
const logger = require('../utils/logger');
const nodemailer = require('nodemailer');

const registerUser = async (data) => {
  const { name, email, password, roleId } = data;
  let transaction;
  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) throw new Error('User already exists');

    let resolvedRoleId = roleId;
    if (!resolvedRoleId) {
      const role = await Role.findOne({ where: { name: 'USER' } });
      if (!role) throw new Error('Default role not found');
      resolvedRoleId = role.id;
    } else {
      const role = await Role.findByPk(roleId);
      if (!role) throw new Error('Invalid roleId provided');
    }

    transaction = await sequelize.transaction();
    const user = await User.create({ name, email, password, roleId: resolvedRoleId }, { transaction });
    await Profile.create({ userId: user.id, bio: 'Default Bio' }, { transaction });
    await transaction.commit();

    logger.info('User registered', { userId: user.id, email: maskEmail(email) });
    await sendWelcomeEmail({ email, name });

    return { id: user.id, name: user.name, email: user.email }; // no password in response
  } catch (error) {
    if (transaction) await transaction.rollback();
    logger.error('Registration failed', { email: maskEmail(email), error: error.message });
    throw error;
  }
};

const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ where: { email }, include: [{ model: Role, attributes: ['name'] }] });
  if (!user) throw new Error('Invalid credentials');  // don't reveal whether email exists

  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) throw new Error('Invalid credentials');

  const roleName = user.Role?.name || 'USER';
  const accessToken  = generateAccessToken(user, roleName);
  const refreshToken = generateRefreshToken(user);

  await RefreshToken.create({
    token: refreshToken,
    userId: user.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });

  logger.info('User logged in', { userId: user.id, email: maskEmail(email) });
  return { accessToken, refreshToken };
};

const refreshAccessToken = async (refreshToken) => {
  const stored = await RefreshToken.findOne({ where: { token: refreshToken } });
  if (!stored || stored.expiresAt < new Date()) throw new Error('Invalid or expired refresh token');

  const decoded = verifyRefreshToken(refreshToken);
  const user = await User.findByPk(decoded.id, { include: [{ model: Role, attributes: ['name'] }] });
  if (!user) throw new Error('User not found');

  return { accessToken: generateAccessToken(user, user.Role?.name || 'USER') };
};

const logoutUser = async (refreshToken) => {
  await RefreshToken.destroy({ where: { token: refreshToken } });
};

async function sendWelcomeEmail({ email, name }) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    await transporter.sendMail({
      from: `"Your App" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Welcome to Our Platform 🎉',
      html: `<h2>Hello ${name},</h2><p>Thank you for registering. We're excited to have you onboard 🚀</p>`
    });
    logger.info('Welcome email sent', { email: maskEmail(email) });
  } catch (err) {
    logger.error('Email failed', { email: maskEmail(email) });
  }
}

module.exports = { registerUser, loginUser, refreshAccessToken, logoutUser };
