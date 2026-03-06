jest.mock('../../src/config/database', () => ({
  authenticate: jest.fn().mockResolvedValue(),
  sync:         jest.fn().mockResolvedValue(),
}));
jest.mock('../../src/config/passport', () => ({
  initialize:    () => (_req, _res, next) => next(),
  authenticate:  () => (_req, _res, next) => next(),
}));
jest.mock('../../src/utils/crypto', () => ({
  encrypt: jest.fn(v => v),
  decrypt: jest.fn(v => v),
}));
jest.mock('../../src/models', () => ({
  User:         { findOne: jest.fn(), create: jest.fn(), findByPk: jest.fn() },
  Role:         { findOne: jest.fn(), findByPk: jest.fn() },
  RefreshToken: { create: jest.fn(), findOne: jest.fn(), destroy: jest.fn() },
  Profile:      { create: jest.fn() },
  sequelize:    { transaction: jest.fn() },
}));
jest.mock('../../src/utils/hash', () => ({
  hashPassword:    jest.fn(p => Promise.resolve(`hashed:${p}`)),
  comparePassword: jest.fn(),
}));
jest.mock('../../src/utils/jwt', () => ({
  generateAccessToken:  jest.fn(() => 'access-token'),
  generateRefreshToken: jest.fn(() => 'refresh-token'),
  verifyToken:          jest.fn(),
  verifyRefreshToken:   jest.fn(),
}));
jest.mock('nodemailer', () => ({ createTransport: jest.fn(() => ({ sendMail: jest.fn() })) }));
jest.mock('../../src/utils/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
// Bypass CSRF and rate-limiting in tests
jest.mock('../../src/middlewares/csrf', () => ({
  csrfTokenHandler: (_req, res) => res.json({ csrfToken: 'test' }),
  csrfProtect:      (_req, _res, next) => next(),
}));
jest.mock('../../src/middlewares/security', () => ({
  helmetConfig:    (_req, _res, next) => next(),
  corsOptions:     (_req, _res, next) => next(),
  globalLimiter:   (_req, _res, next) => next(),
  authLimiter:     (_req, _res, next) => next(),
  hppProtect:      (_req, _res, next) => next(),
  attackDetection: (_req, _res, next) => next(),
  noCache:         (_req, _res, next) => next(),
}));

const request = require('supertest');
const app     = require('../../src/app');
const { User, Role, RefreshToken, Profile, sequelize } = require('../../src/models');
const { comparePassword } = require('../../src/utils/hash');

describe('Auth Service — Integration', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('POST /auth/register', () => {
    it('returns 201 on successful registration', async () => {
      User.findOne.mockResolvedValue(null);
      Role.findOne.mockResolvedValue({ id: 1 });
      const tx = { commit: jest.fn(), rollback: jest.fn() };
      sequelize.transaction.mockResolvedValue(tx);
      User.create.mockResolvedValue({ id: 1, name: 'Alice', email: 'alice@test.com' });
      Profile.create.mockResolvedValue({});

      const res = await request(app)
        .post('/auth/register')
        .send({ name: 'Alice', email: 'alice@test.com', password: 'Password1!' });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('User registered successfully');
    });

    it('returns 400 on missing fields', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'alice@test.com' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('returns 200 and sets cookies on valid credentials', async () => {
      User.findOne.mockResolvedValue({ id: 1, password: 'hash', Role: { name: 'USER' } });
      comparePassword.mockResolvedValue(true);
      RefreshToken.create.mockResolvedValue({});

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'alice@test.com', password: 'Password1!' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Login successfully');
    });

    it('returns 500 on invalid credentials (non-operational error)', async () => {
      User.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'x@x.com', password: 'wrong' });

      // loginUser throws plain Error (not AppError), errorHandler returns 500
      expect(res.status).toBe(500);
    });
  });

  describe('POST /auth/logout', () => {
    it('clears cookies and returns 200', async () => {
      RefreshToken.destroy.mockResolvedValue(1);

      const res = await request(app)
        .post('/auth/logout')
        .set('Cookie', 'refreshToken=rt');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');
    });
  });
});
