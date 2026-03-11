const express = require('express');
const { runFileWorker } = require('./services/workerService');
const processFile = require('./workers/fileProcessor');
const pool = require('./workers/pool');
const authenticate = require('./middlewares/auth.middleware');
const errorHandler = require('./middlewares/errorHandler');
const { helmetConfig, corsOptions, globalLimiter, hppProtect, attackDetection } = require('./middlewares/security');
const { sanitizeInput } = require('./middlewares/sanitize');
const logger = require('./utils/logger');

const app = express();
app.use(helmetConfig);
app.use(corsOptions);
app.use(globalLimiter);
app.use(express.json({ limit: '10kb' }));
app.use(hppProtect);
app.use(sanitizeInput);
app.use(attackDetection);

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

app.post('/workers/file', authenticate, async (req, res, next) => {
  try {
    const { fileName, s3Key } = req.body;
    const [workerResult, checksum] = await Promise.all([
      runFileWorker({ fileName }),
      processFile(s3Key)
    ]);
    res.json({ workerResult, checksum });
  } catch (error) { next(error); }
});

app.post('/workers/report', authenticate, async (req, res, next) => {
  try {
    const result = await pool.run(req.body.data);
    res.json({ result });
  } catch (error) { next(error); }
});

app.use(errorHandler);

module.exports = app;
