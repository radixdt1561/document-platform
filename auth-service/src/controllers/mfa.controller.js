const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

const setupMFA = async (req, res, next) => {
  try {
    const secret = speakeasy.generateSecret({ name: `DocumentPlatform (${req.user.id})` });
    const qrDataUrl = await qrcode.toDataURL(secret.otpauth_url);
    res.json({ secret: secret.base32, qr: qrDataUrl });
  } catch (error) { next(error); }
};

const verifyMFA = (req, res, next) => {
  try {
    const { secret, token } = req.body;
    const verified = speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 1 });
    if (!verified) return res.status(401).json({ message: 'Invalid MFA token' });
    res.json({ message: 'MFA verified successfully' });
  } catch (error) { next(error); }
};

module.exports = { setupMFA, verifyMFA };
