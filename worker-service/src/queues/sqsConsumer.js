const { ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const sqs = require('../config/sqs');
const logger = require('../utils/logger');
const { handleAnalytics } = require('../handlers/analyticsHandler');
const { handleNotification } = require('../handlers/notificationHandler');
const { handleVirusScan } = require('../handlers/virusScanHandler');

const QUEUE_URL = process.env.SQS_QUEUE_URL;

async function processMessage(body) {
  if (body.event !== 'document.uploaded') return;

  const { data } = body;
  logger.info('SQS: processing document.uploaded', { documentId: data.documentId });

  await Promise.allSettled([
    handleAnalytics(data),
    handleNotification(data),
    handleVirusScan(data)
  ]);
}

async function pollQueue() {
  logger.info('Worker service polling SQS...');
  while (true) {
    const response = await sqs.send(new ReceiveMessageCommand({
      QueueUrl: QUEUE_URL,
      MaxNumberOfMessages: 5,
      WaitTimeSeconds: 20
    }));

    if (!response.Messages) continue;

    for (const message of response.Messages) {
      try {
        await processMessage(JSON.parse(message.Body));
        await sqs.send(new DeleteMessageCommand({
          QueueUrl: QUEUE_URL,
          ReceiptHandle: message.ReceiptHandle
        }));
      } catch (err) {
        logger.error(`Failed to process message: ${err.message}`);
      }
    }
  }
}

module.exports = { pollQueue };
