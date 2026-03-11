require('dotenv').config();

const pool = {
  max: 10,
  min: 2,
  acquire: 30000,
  idle: 10000
};

const slowQueryLogger = (query, time) => {
  if (time > 500) process.stderr.write(`[SLOW QUERY] ${time}ms :: ${query}\n`);
};

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    benchmark: true,
    logging: slowQueryLogger,
    pool
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    benchmark: true,
    logging: slowQueryLogger,
    pool,
    replication: {
      read:  [{ host: process.env.DB_READ_HOST || process.env.DB_HOST }],
      write: { host: process.env.DB_HOST }
    }
  }
};