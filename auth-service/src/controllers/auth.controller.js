const { registerUser, loginUser, refreshAccessToken, logoutUser } = require('../services/user.service');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,                  // always secure — tokens must travel over HTTPS only
  sameSite: 'strict',
  path: '/',
  signed: false
};

const ACCESS_COOKIE  = { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 };
const REFRESH_COOKIE = { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/auth/refresh' };

const register = async (req, res, next) => {
  try {
    const user = await registerUser(req.body);
    res.status(201).json({ message: 'User registered successfully', user });
  } catch (error) { next(error); }
};

const login = async (req, res, next) => {
  try {
    const { accessToken, refreshToken } = await loginUser(req.body);
    res
      .cookie('accessToken', accessToken, ACCESS_COOKIE)
      .cookie('refreshToken', refreshToken, REFRESH_COOKIE)
      .json({ message: 'Login successfully' });
  } catch (error) { next(error); }
};

const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) throw new Error('Refresh token missing');
    const { accessToken } = await refreshAccessToken(refreshToken);
    res
      .cookie('accessToken', accessToken, ACCESS_COOKIE)
      .json({ message: 'Token refreshed' });
  } catch (error) { next(error); }
};

const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) await logoutUser(refreshToken);
    res.clearCookie('accessToken').clearCookie('refreshToken').json({ message: 'Logged out successfully' });
  } catch (error) { next(error); }
};

module.exports = { register, login, refresh, logout };
