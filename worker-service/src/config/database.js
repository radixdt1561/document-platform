require('dotenv').config();

const pool = { max: 5, min: 1, acquire: 30000, idle: 10000 };

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT,
    dialect:  'postgres',
    logging:  false,
    pool
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT,
    dialect:  'postgres',
    logging:  false,
    pool
  }
};
