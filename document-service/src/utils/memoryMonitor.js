const logger = require('./logger');

const THRESHOLD_MB  = parseInt(process.env.MEMORY_THRESHOLD_MB  || '400');
const INTERVAL_MS   = parseInt(process.env.MEMORY_INTERVAL_MS   || '30000');
const CRITICAL_MB   = parseInt(process.env.MEMORY_CRITICAL_MB   || '600');

function toMB(bytes) { return Math.round(bytes / 1024 / 1024); }

function checkMemory() {
  const { heapUsed, heapTotal, rss, external } = process.memoryUsage();
  const heapMB = toMB(heapUsed);
  const rssMB  = toMB(rss);

  logger.info('memory', { heapUsedMB: heapMB, heapTotalMB: toMB(heapTotal), rssMB, externalMB: toMB(external) });

  if (heapMB >= CRITICAL_MB) {
    logger.error('CRITICAL memory threshold reached', { heapMB });
    if (global.gc) global.gc();
  } else if (heapMB >= THRESHOLD_MB) {
    logger.warn('High memory usage detected', { heapMB, thresholdMB: THRESHOLD_MB });
    if (global.gc) global.gc();
  }
}

function startMemoryMonitor() {
  const interval = setInterval(checkMemory, INTERVAL_MS);
  interval.unref(); // don't block process exit
  return interval;
}

module.exports = { startMemoryMonitor, checkMemory };
