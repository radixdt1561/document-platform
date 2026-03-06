const { SendMessageCommand } = require('@aws-sdk/client-sqs');
const sqs = require('../config/sqs');

const sendMessage = (message) =>
  sqs.send(new SendMessageCommand({
    QueueUrl: process.env.SQS_QUEUE_URL,
    MessageBody: JSON.stringify(message)
  }));

module.exports = { sendMessage };
