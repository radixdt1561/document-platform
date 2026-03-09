const { User, Role, Profile, UploadEvent, sequelize } = require('../models');
const { QueryTypes } = require('sequelize');
const cache = require('../utils/cache');
const logger = require('../utils/logger');

const getUserAnalytics = async (req, res, next) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;

    const cacheKey = `analytics:users:${page}:${limit}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    // Advanced query: join users with upload event counts (subquery)
    const users = await sequelize.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u."createdAt",
        r.name AS role,
        p.bio,
        COALESCE(ev.upload_count, 0) AS "uploadCount"
      FROM "Users" u
      LEFT JOIN "Roles"    r  ON r.id = u."roleId"
      LEFT JOIN "Profiles" p  ON p."userId" = u.id
      LEFT JOIN (
        SELECT "userId", COUNT(*) AS upload_count
        FROM upload_events
        GROUP BY "userId"
      ) ev ON ev."userId" = u.id
      ORDER BY u."createdAt" DESC
      LIMIT :limit OFFSET :offset
    `, {
      replacements: { limit, offset },
      type: QueryTypes.SELECT
    });

    const [{ total }] = await sequelize.query(
      'SELECT COUNT(*) AS total FROM "Users"',
      { type: QueryTypes.SELECT }
    );

    const response = { total: parseInt(total), page, limit, users };
    await cache.set(cacheKey, response, 120);
    res.json(response);
  } catch (err) {
    logger.error('Failed to fetch analytics data', { error: err.message });
    next(err);
  }
};

module.exports = { getUserAnalytics };
