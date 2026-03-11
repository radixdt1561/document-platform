'use strict';

// Mock Redis cache before app is loaded — prevents client.connect() on require
jest.mock('../../src/utils/cache', () => ({ get: jest.fn(), set: jest.fn(), del: jest.fn() }));
jest.mock('../../src/utils/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
jest.mock('../../src/middlewares/auth.middleware', () => (req, _res, next) => {
  req.user = { id: 1, name: 'Alice', email: 'a@b.com', role: 'USER' };
  next();
});
jest.mock('../../src/middlewares/rbac.middleware', () => () => (_req, _res, next) => next());

const request = require('supertest');
const app = require('../../src/app');
const cache = require('../../src/utils/cache');

describe('user-service routes', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /users/profile', () => {
    it('returns cached profile when cache hit', async () => {
      const cached = { message: 'Protected route accessed', user: { id: 1 } };
      cache.get.mockResolvedValue(cached);

      const res = await request(app).get('/users/profile');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(cached);
      expect(cache.set).not.toHaveBeenCalled();
    });

    it('builds and caches profile on cache miss', async () => {
      cache.get.mockResolvedValue(null);
      cache.set.mockResolvedValue(true);

      const res = await request(app).get('/users/profile');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Protected route accessed');
      expect(res.body).toHaveProperty('user');
      expect(cache.set).toHaveBeenCalled();
    });

    it('returns 500 on cache failure', async () => {
      cache.get.mockRejectedValue(new Error('Redis down'));

      const res = await request(app).get('/users/profile');
      expect(res.status).toBe(500);
    });
  });

  describe('GET /users/admin/dashboard', () => {
    it('returns welcome message', async () => {
      const res = await request(app).get('/users/admin/dashboard');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
    });
  });
});
