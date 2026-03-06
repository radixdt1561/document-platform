const crypto = require('crypto');

const ALGO   = 'aes-256-gcm';
const KEY    = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // 32-byte hex key
const IV_LEN = 16;

function encrypt(plaintext) {
  const iv         = crypto.randomBytes(IV_LEN);
  const cipher     = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted  = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag    = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(ciphertext) {
  const [ivHex, tagHex, dataHex] = ciphertext.split(':');
  const decipher = crypto.createDecipheriv(ALGO, KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(dataHex, 'hex'), undefined, 'utf8') + decipher.final('utf8');
}

// safe decrypt — returns original value if not encrypted (migration-safe)
function safeDecrypt(value) {
  if (!value || !value.includes(':')) return value;
  try { return decrypt(value); } catch { return value; }
}

module.exports = { encrypt, decrypt, safeDecrypt };
