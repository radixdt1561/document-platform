const logger = require('../utils/logger');
const { runFileWorker } = require('../services/workerService');
const processFile = require('../workers/fileProcessor');

async function handleVirusScan(data) {
  logger.info('VirusScan: starting scan', { fileName: data.fileName });

  const [workerResult, checksum] = await Promise.all([
    runFileWorker({ fileName: data.fileName }),
    processFile(data.fileName)
  ]);

  logger.info('VirusScan: completed', { fileName: data.fileName, checksum });
  return { workerResult, checksum };
}

module.exports = { handleVirusScan };
