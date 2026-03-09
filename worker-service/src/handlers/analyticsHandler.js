const logger = require('../utils/logger');
const { UploadEvent } = require('../models/uploadEvent');

async function handleAnalytics(data) {
  logger.info('Analytics: document uploaded', { documentId: data.documentId, userId: data.userId });
  await UploadEvent.create({
    documentId: data.documentId,
    userId:     data.userId,
    fileName:   data.fileName,
    fileUrl:    data.fileUrl
  });
}

module.exports = { handleAnalytics };
