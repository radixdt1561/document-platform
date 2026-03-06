require('dotenv').config();
const logger = require('../utils/logger');

const pool = { max: 20, min: 5, acquire: 30000, idle: 10000 };

const slowQueryLogger = (query, time) => {
  if (time > 200) logger.warn('Slow query detected', { duration: `${time}ms`, query });
};

const base = {
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  dialect:  'postgres',
  benchmark: true,
  logging:  slowQueryLogger,
  pool
};

module.exports = {
  development: base,
  production: {
    ...base,
    replication: {
      read:  [{ host: process.env.DB_READ_HOST || process.env.DB_HOST }],
      write: { host: process.env.DB_HOST }
    }
  }
};
