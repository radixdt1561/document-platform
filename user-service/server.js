require('dotenv').config();
const https  = require('https');
const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const app    = require('./src/app');
const logger = require('./src/utils/logger');

const PORT      = parseInt(process.env.PORT)      || 4005;
const HTTP_PORT = parseInt(process.env.HTTP_PORT) || (PORT + 1000);

const certPath = process.env.TLS_CERT || path.resolve(__dirname, '../certs/cert.pem');
const keyPath  = process.env.TLS_KEY  || path.resolve(__dirname, '../certs/key.pem');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  const tlsOptions = { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) };
  https.createServer(tlsOptions, app).listen(PORT, () =>
    logger.info(' HTTPS running', { port: PORT }));

  // redirect HTTP → HTTPS
  http.createServer((req, res) => {
    res.writeHead(301, { Location: `https://${req.headers.host?.replace(HTTP_PORT, PORT)}${req.url}` });
    res.end();
  }).listen(HTTP_PORT, () => logger.info(' HTTP→HTTPS redirect', { port: HTTP_PORT }));
} else {
  app.listen(PORT, () => logger.warn(' running HTTP (no TLS certs found)', { port: PORT }));
}

process.on('unhandledRejection', (err) => logger.error('Unhandled Rejection', { error: err.message, stack: err.stack }));
process.on('uncaughtException',  (err) => { logger.error('Uncaught Exception', { error: err.message, stack: err.stack }); process.exit(1); });
