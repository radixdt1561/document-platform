const { Worker } = require('worker_threads');
const path = require('path');

function runFileWorker(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      path.resolve(__dirname, '../workers/fileWorker.js'),
      { workerData: data }
    );
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
    });
  });
}

module.exports = { runFileWorker };
