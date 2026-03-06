const { createClient } = require('redis');
const crypto = require('crypto');
const logger = require('../utils/logger');

const client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
client.on('error', (err) => logger.error(`Redis error: ${err.message}`));
client.connect().catch((err) => logger.error(`Redis connect failed: ${err.message}`));

const ALGO   = 'aes-256-gcm';
const KEY    = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
const IV_LEN = 16;

function encryptValue(plaintext) {
  const iv        = crypto.randomBytes(IV_LEN);
  const cipher    = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag       = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptValue(ciphertext) {
  const [ivHex, tagHex, dataHex] = ciphertext.split(':');
  const decipher = crypto.createDecipheriv(ALGO, KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(dataHex, 'hex'), undefined, 'utf8') + decipher.final('utf8');
}

const get = async (key) => {
  const data = await client.get(key);
  if (!data) return null;
  try {
    return JSON.parse(decryptValue(data));
  } catch {
    logger.warn('Cache: decryption failed, evicting key', { key });
    await client.del(key);
    return null;
  }
};

const set = (key, value, ttlSeconds = 60) =>
  client.setEx(key, ttlSeconds, encryptValue(JSON.stringify(value)));

const del = (key) => client.del(key);

module.exports = { get, set, del };
