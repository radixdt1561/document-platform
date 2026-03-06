const logger = require('../utils/logger');

async function handleAnalytics(data) {
  logger.info('Analytics: document uploaded', { documentId: data.documentId, userId: data.userId });
}

module.exports = { handleAnalytics };
