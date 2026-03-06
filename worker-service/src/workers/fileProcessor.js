const crypto = require('crypto');
const s3 = require('../config/aws');

async function processFile(s3Key) {
  const stream = s3
    .getObject({ Bucket: process.env.AWS_BUCKET, Key: s3Key })
    .createReadStream();

  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    stream
      .on('data', (chunk) => hash.update(chunk))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject);
  });
}

module.exports = processFile;
