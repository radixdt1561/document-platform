const { User, Role, Profile } = require('../models');
const cache = require('../utils/cache');
const logger = require('../utils/logger');

const getUserAnalytics = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;

    const cacheKey = `analytics:users:${page}:${limit}`;

    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const { count, rows: users } = await User.findAndCountAll({
      attributes: ['id', 'name', 'email', 'createdAt'],
      include: [
        { model: Role,    attributes: ['name'] },
        { model: Profile, attributes: ['bio']  }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    const response = { total: count, page, limit, users };
    await cache.set(cacheKey, response, 120);
    res.json(response);
  } catch (err) {
    logger.error('Failed to fetch analytics data', { error: err.message });
    next(new Error('Failed to fetch analytics data'));
  }
};

module.exports = { getUserAnalytics };
