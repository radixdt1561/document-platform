require('dotenv').config();
const https  = require('https');
const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// --- Security headers ---
app.use(helmet({
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// --- CORS ---
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, cb) => (!origin || ALLOWED_ORIGINS.includes(origin)) ? cb(null, true) : cb(new Error('Not allowed by CORS')),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

// --- Rate limiting ---
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests' }
}));

// --- Proxy routes ---
const proxy = (target) => createProxyMiddleware({ target, changeOrigin: true });

app.use('/auth',      proxy('http://localhost:4001'));
app.use('/documents', proxy('http://localhost:4002'));
app.use('/analytics', proxy('http://localhost:4003'));
app.use('/users',     proxy('http://localhost:4005'));
app.use('/workers',   proxy('http://localhost:4006'));

// --- HTTPS / HTTP redirect ---
const PORT      = process.env.PORT      || 4000;
const HTTP_PORT = process.env.HTTP_PORT || 5000;
const certPath  = process.env.TLS_CERT  || path.resolve(__dirname, '../certs/cert.pem');
const keyPath   = process.env.TLS_KEY   || path.resolve(__dirname, '../certs/key.pem');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  const tlsOptions = { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) };
  https.createServer(tlsOptions, app).listen(PORT, () =>
    console.log(`API Gateway HTTPS running on port ${PORT}`));

  http.createServer((req, res) => {
    res.writeHead(301, { Location: `https://${req.headers.host?.replace(HTTP_PORT, PORT)}${req.url}` });
    res.end();
  }).listen(HTTP_PORT, () => console.log(`API Gateway HTTP→HTTPS redirect on port ${HTTP_PORT}`));
} else {
  app.listen(PORT, () => console.warn(`API Gateway running HTTP (no TLS certs) on port ${PORT}`));
}
