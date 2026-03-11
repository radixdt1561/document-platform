const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { User, Role } = require('../models');
const logger = require('../utils/logger');
const { maskEmail } = require('../utils/mask');

passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  process.env.GOOGLE_CALLBACK_URL,
  scope:        ['profile', 'email']   // minimal scopes only
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email         = profile.emails?.[0]?.value;
    const emailVerified = profile.emails?.[0]?.verified === true;
    const name          = profile.displayName;

    if (!email)         return done(new Error('No email returned from Google'));
    if (!emailVerified) return done(new Error('Google email is not verified'));

    let user = await User.findOne({ where: { providerId: profile.id, provider: 'google' } });

    if (!user) {
      const defaultRole = await Role.findOne({ where: { name: 'USER' } });
      user = await User.create({
        name,
        email,
        provider:      'google',
        providerId:    profile.id,
        emailVerified: true,
        roleId:        defaultRole?.id
      });
      logger.info('OAuth user created', { email: maskEmail(email) });
    }

    return done(null, user);
  } catch (err) {
    logger.error('Google OAuth error', { error: err.message });
    return done(err);
  }
}));

module.exports = passport;
