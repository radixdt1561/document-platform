const { workerData, parentPort } = require("worker_threads");
const crypto = require("crypto");

function processFile(data) {
  console.log("Worker processing file:==>>", data.fileName);

  const hash = crypto
    .createHash("sha256")
    .update(data.fileName + Date.now())
    .digest("hex");

  return {
    fileName: data.fileName,
    checksum: hash,
  };
}

const result = processFile(workerData);

parentPort.postMessage(result);
