const logger = require('../utils/logger');
const { runFileWorker } = require('../services/workerService');
const processFile = require('../workers/fileProcessor');
const { UploadEvent } = require('../models/uploadEvent');

async function handleVirusScan(data) {
  logger.info('VirusScan: starting scan', { fileName: data.fileName });

  const [workerResult, checksum] = await Promise.all([
    runFileWorker({ fileName: data.fileName }),
    processFile(data.fileName)
  ]);

  // Persist checksum back to the analytics record
  await UploadEvent.update(
    { checksum, scannedAt: new Date() },
    { where: { documentId: data.documentId } }
  );

  logger.info('VirusScan: completed', { fileName: data.fileName, checksum });
  return { workerResult, checksum };
}

module.exports = { handleVirusScan };
