const crypto = require('crypto');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const s3 = require('../config/aws');

async function processFile(s3Key) {
  const { Body } = await s3.send(new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET,
    Key: s3Key,
  }));

  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    Body.on('data', (chunk) => hash.update(chunk))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject);
  });
}

module.exports = processFile;
