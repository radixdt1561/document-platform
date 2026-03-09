require('dotenv').config();
const { handleAnalytics } = require('../src/handlers/analyticsHandler');
const { handleNotification } = require('../src/handlers/notificationHandler');
const { handleVirusScan } = require('../src/handlers/virusScanHandler');
const logger = require('../src/utils/logger');

exports.handler = async (event) => {
  const results = await Promise.allSettled(
    event.Records.map(async (record) => {
      const body = JSON.parse(record.body);
      if (body.event !== 'document.uploaded') return;

      const { data } = body;
      logger.info('Lambda: processing document.uploaded', { documentId: data.documentId });

      await Promise.allSettled([
        handleAnalytics(data),
        handleNotification(data),
        handleVirusScan(data),
      ]);
    })
  );

  const failures = results
    .map((r, i) => r.status === 'rejected' ? { itemIdentifier: event.Records[i].messageId } : null)
    .filter(Boolean);

  // Return failed message IDs so SQS can retry them
  return { batchItemFailures: failures };
};
