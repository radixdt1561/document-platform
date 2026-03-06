const logger = require('../utils/logger');

async function handleNotification(data) {
  logger.info('Notification: document uploaded successfully', { userId: data.userId });
}

module.exports = { handleNotification };
