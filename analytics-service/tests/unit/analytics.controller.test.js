jest.mock('../../src/models', () => ({
  User: {},
  Role: {},
  Profile: {},
  UploadEvent: {},
  sequelize: { query: jest.fn() },
}));
jest.mock('../../src/utils/cache', () => ({ get: jest.fn(), set: jest.fn() }));
jest.mock('../../src/utils/logger', () => ({ info: jest.fn(), error: jest.fn() }));

const { sequelize } = require('../../src/models');
const cache = require('../../src/utils/cache');
const { getUserAnalytics } = require('../../src/controllers/analytics.controller');

const mockRes = () => {
  const res = {};
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const mockNext = jest.fn();

describe('analytics.controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getUserAnalytics', () => {
    it('returns cached response when cache hit', async () => {
      const cached = { total: 1, page: 1, limit: 10, users: [] };
      cache.get.mockResolvedValue(cached);

      const req = { query: {} };
      const res = mockRes();
      await getUserAnalytics(req, res, mockNext);

      expect(res.json).toHaveBeenCalledWith(cached);
      expect(sequelize.query).not.toHaveBeenCalled();
    });

    it('queries DB on cache miss and caches result', async () => {
      cache.get.mockResolvedValue(null);
      const users = [{ id: 1, name: 'Alice', uploadCount: 3 }];
      sequelize.query
        .mockResolvedValueOnce(users)
        .mockResolvedValueOnce([{ total: '1' }]);
      cache.set.mockResolvedValue(true);

      const req = { query: { page: '1', limit: '10' } };
      const res = mockRes();
      await getUserAnalytics(req, res, mockNext);

      expect(res.json).toHaveBeenCalledWith({ total: 1, page: 1, limit: 10, users });
      expect(cache.set).toHaveBeenCalled();
    });

    it('clamps limit to 100', async () => {
      cache.get.mockResolvedValue(null);
      sequelize.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: '0' }]);

      const req = { query: { page: '1', limit: '999' } };
      const res = mockRes();
      await getUserAnalytics(req, res, mockNext);

      const callArgs = sequelize.query.mock.calls[0];
      expect(callArgs[1].replacements.limit).toBe(100);
    });

    it('defaults page to 1 and limit to 10', async () => {
      cache.get.mockResolvedValue(null);
      sequelize.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: '0' }]);

      const req = { query: {} };
      const res = mockRes();
      await getUserAnalytics(req, res, mockNext);

      const callArgs = sequelize.query.mock.calls[0];
      expect(callArgs[1].replacements.limit).toBe(10);
      expect(callArgs[1].replacements.offset).toBe(0);
    });

    it('calls next with error on DB failure', async () => {
      cache.get.mockResolvedValue(null);
      sequelize.query.mockRejectedValue(new Error('DB error'));

      const req = { query: {} };
      const res = mockRes();
      await getUserAnalytics(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
