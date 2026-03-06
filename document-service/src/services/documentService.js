const { Document } = require('../models');
const sqsProducer = require('../queues/sqsProducer');

async function handleUpload(documentData) {
  const document = await Document.create(documentData);
  await sqsProducer.sendMessage({
    event: 'document.uploaded',
    data: {
      documentId: document.id,
      userId: document.userId,
      fileName: document.fileName,
      fileUrl: document.fileUrl
    }
  });
  return document;
}

module.exports = { handleUpload };
