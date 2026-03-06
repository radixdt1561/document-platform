const express = require('express');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const authenticate = require('./middlewares/auth.middleware');
const authorizePermission = require('./middlewares/permission.middleware');
const upload = require('./middlewares/upload.middleware');
const errorHandler = require('./middlewares/errorHandler');
const { helmetConfig, corsOptions, globalLimiter, hppProtect, attackDetection } = require('./middlewares/security');
const { csrfTokenHandler, csrfProtect } = require('./middlewares/csrf');
const { sanitizeInput } = require('./middlewares/sanitize');
const {
  listDocuments, getUploadUrl,
  uploadDocument, getDocument, deleteDocument
} = require('./controllers/document.controller');
const logger = require('./utils/logger');

const app = express();
app.use(helmetConfig);
app.use(corsOptions);
app.use(globalLimiter);
app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(hppProtect);
app.use(sanitizeInput);
app.use(attackDetection);

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    res.setHeader('X-Response-Time', `${ms}ms`);
    logger.info(`${req.method} ${req.path}`, { status: res.statusCode, ms, ip: req.ip });
  });
  next();
});

app.get('/documents/csrf-token', csrfTokenHandler);
app.get('/documents',            authenticate, authorizePermission, listDocuments);
app.post('/documents/upload-url', authenticate, authorizePermission, csrfProtect, getUploadUrl);

app.post('/documents/upload',
  authenticate, authorizePermission, csrfProtect,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) return next(err);
      if (!req.file) return next(new Error('No file received'));
      next();
    });
  },
  uploadDocument
);

app.get('/documents/:id',    authenticate, authorizePermission, getDocument);
app.delete('/documents/:id', authenticate, authorizePermission, csrfProtect, deleteDocument);

app.use(errorHandler);

module.exports = app;
