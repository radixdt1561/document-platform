jest.mock('../../src/models', () => ({
  User:         { findOne: jest.fn(), create: jest.fn(), findByPk: jest.fn() },
  Role:         { findOne: jest.fn(), findByPk: jest.fn() },
  RefreshToken: { create: jest.fn(), findOne: jest.fn(), destroy: jest.fn() },
  Profile:      { create: jest.fn() },
  sequelize:    { transaction: jest.fn() },
}));
jest.mock('../../src/utils/hash',   () => ({ comparePassword: jest.fn() }));
jest.mock('../../src/utils/jwt',    () => ({
  generateAccessToken:  jest.fn(() => 'access-token'),
  generateRefreshToken: jest.fn(() => 'refresh-token'),
  verifyRefreshToken:   jest.fn(),
}));
jest.mock('nodemailer', () => ({ createTransport: jest.fn(() => ({ sendMail: jest.fn() })) }));
jest.mock('../../src/utils/logger', () => ({ info: jest.fn(), error: jest.fn() }));

const { User, Role, RefreshToken, Profile, sequelize } = require('../../src/models');
const { comparePassword }                              = require('../../src/utils/hash');
const { verifyRefreshToken }                           = require('../../src/utils/jwt');
const { registerUser, loginUser, refreshAccessToken, logoutUser } = require('../../src/services/user.service');

describe('user.service', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('registerUser', () => {
    it('throws if user already exists', async () => {
      User.findOne.mockResolvedValue({ id: 1 });
      await expect(registerUser({ name: 'A', email: 'a@b.com', password: 'pass' }))
        .rejects.toThrow('User already exists');
    });

    it('registers user with default role', async () => {
      User.findOne.mockResolvedValue(null);
      Role.findOne.mockResolvedValue({ id: 2 });
      const tx = { commit: jest.fn(), rollback: jest.fn() };
      sequelize.transaction.mockResolvedValue(tx);
      User.create.mockResolvedValue({ id: 1, name: 'A', email: 'a@b.com' });
      Profile.create.mockResolvedValue({});

      const result = await registerUser({ name: 'A', email: 'a@b.com', password: 'pass' });
      expect(result).toEqual({ id: 1, name: 'A', email: 'a@b.com' });
      expect(tx.commit).toHaveBeenCalled();
    });

    it('rolls back transaction on DB error', async () => {
      User.findOne.mockResolvedValue(null);
      Role.findOne.mockResolvedValue({ id: 2 });
      const tx = { commit: jest.fn(), rollback: jest.fn() };
      sequelize.transaction.mockResolvedValue(tx);
      User.create.mockRejectedValue(new Error('DB error'));

      await expect(registerUser({ name: 'A', email: 'a@b.com', password: 'pass' }))
        .rejects.toThrow('DB error');
      expect(tx.rollback).toHaveBeenCalled();
    });
  });

  describe('loginUser', () => {
    it('throws on unknown email', async () => {
      User.findOne.mockResolvedValue(null);
      await expect(loginUser({ email: 'x@x.com', password: 'p' }))
        .rejects.toThrow('Invalid credentials');
    });

    it('throws on wrong password', async () => {
      User.findOne.mockResolvedValue({ id: 1, password: 'hash', Role: { name: 'USER' } });
      comparePassword.mockResolvedValue(false);
      await expect(loginUser({ email: 'a@b.com', password: 'wrong' }))
        .rejects.toThrow('Invalid credentials');
    });

    it('returns tokens on valid credentials', async () => {
      User.findOne.mockResolvedValue({ id: 1, password: 'hash', Role: { name: 'USER' } });
      comparePassword.mockResolvedValue(true);
      RefreshToken.create.mockResolvedValue({});

      const result = await loginUser({ email: 'a@b.com', password: 'correct' });
      expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
    });
  });

  describe('refreshAccessToken', () => {
    it('throws on missing token', async () => {
      RefreshToken.findOne.mockResolvedValue(null);
      await expect(refreshAccessToken('bad')).rejects.toThrow('Invalid or expired refresh token');
    });

    it('throws on expired token', async () => {
      RefreshToken.findOne.mockResolvedValue({ token: 'rt', expiresAt: new Date(Date.now() - 1000) });
      await expect(refreshAccessToken('rt')).rejects.toThrow('Invalid or expired refresh token');
    });

    it('returns new access token', async () => {
      RefreshToken.findOne.mockResolvedValue({ token: 'rt', expiresAt: new Date(Date.now() + 10000) });
      verifyRefreshToken.mockReturnValue({ id: 1 });
      User.findByPk.mockResolvedValue({ id: 1, Role: { name: 'USER' } });

      const result = await refreshAccessToken('rt');
      expect(result.accessToken).toBe('access-token');
    });
  });

  describe('logoutUser', () => {
    it('destroys the refresh token', async () => {
      RefreshToken.destroy.mockResolvedValue(1);
      await logoutUser('rt');
      expect(RefreshToken.destroy).toHaveBeenCalledWith({ where: { token: 'rt' } });
    });
  });
});
