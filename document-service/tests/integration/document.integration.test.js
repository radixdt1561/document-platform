jest.mock('../../src/config/database', () => ({
  authenticate: jest.fn().mockResolvedValue(),
  sync:         jest.fn().mockResolvedValue(),
}));
jest.mock('../../src/models', () => ({
  Document: { findAndCountAll: jest.fn(), findOne: jest.fn(), destroy: jest.fn() },
}));
jest.mock('../../src/utils/cache',  () => ({ get: jest.fn(), set: jest.fn(), del: jest.fn() }));
jest.mock('../../src/utils/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
jest.mock('../../src/config/aws',   () => ({ send: jest.fn() }));
jest.mock('../../src/services/documentService', () => ({ handleUpload: jest.fn() }));
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(() => Promise.resolve('https://s3.url/key')),
}));
jest.mock('@aws-sdk/client-s3', () => ({
  PutObjectCommand:    jest.fn(),
  GetObjectCommand:    jest.fn(),
  DeleteObjectCommand: jest.fn(),
}));
jest.mock('../../src/middlewares/auth.middleware',       () => (req, _res, next) => { req.user = { id: 'user-1', role: 'USER' }; next(); });
jest.mock('../../src/middlewares/permission.middleware', () => (_req, _res, next) => next());
jest.mock('../../src/middlewares/upload.middleware',     () => ({ single: () => (_req, _res, next) => next() }));
jest.mock('../../src/middlewares/csrf', () => ({
  csrfTokenHandler: (_req, res) => res.json({ csrfToken: 'test' }),
  csrfProtect:      (_req, _res, next) => next(),
}));
jest.mock('../../src/middlewares/security', () => ({
  helmetConfig:    (_req, _res, next) => next(),
  corsOptions:     (_req, _res, next) => next(),
  globalLimiter:   (_req, _res, next) => next(),
  hppProtect:      (_req, _res, next) => next(),
  attackDetection: (_req, _res, next) => next(),
}));

const request          = require('supertest');
const app              = require('../../src/app');
const { Document }     = require('../../src/models');
const cache            = require('../../src/utils/cache');
const { handleUpload } = require('../../src/services/documentService');
const s3               = require('../../src/config/aws');

describe('Document Service — Integration', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /documents', () => {
    it('returns paginated documents from DB', async () => {
      cache.get.mockResolvedValue(null);
      Document.findAndCountAll.mockResolvedValue({ count: 1, rows: [{ id: 'doc-1', fileName: 'a.pdf' }] });

      const res = await request(app).get('/documents');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('documents');
      expect(res.body.total).toBe(1);
    });

    it('returns cached response without hitting DB', async () => {
      cache.get.mockResolvedValue({ total: 5, documents: [] });

      const res = await request(app).get('/documents');
      expect(res.status).toBe(200);
      expect(Document.findAndCountAll).not.toHaveBeenCalled();
    });
  });

  describe('POST /documents/upload-url', () => {
    it('returns presigned URL', async () => {
      process.env.AWS_BUCKET = 'test-bucket';
      const res = await request(app)
        .post('/documents/upload-url')
        .send({ fileName: 'test.pdf', contentType: 'application/pdf' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('url');
    });

    it('returns 400 on missing body fields', async () => {
      const res = await request(app)
        .post('/documents/upload-url')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /documents/:id', () => {
    it('returns 404 for unknown document', async () => {
      cache.get.mockResolvedValue(null);
      Document.findOne.mockResolvedValue(null);

      const res = await request(app).get('/documents/doc-99');
      expect(res.status).toBe(404);
    });

    it('returns signed URL for existing document', async () => {
      cache.get.mockResolvedValue(null);
      Document.findOne.mockResolvedValue({ id: 'doc-1', fileName: 'key.pdf', fileUrl: 'url' });

      const res = await request(app).get('/documents/doc-1');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('url');
    });
  });

  describe('DELETE /documents/:id', () => {
    it('returns 404 for unknown document', async () => {
      Document.findOne.mockResolvedValue(null);
      const res = await request(app).delete('/documents/doc-99');
      expect(res.status).toBe(404);
    });

    it('deletes document and returns 200', async () => {
      Document.findOne.mockResolvedValue({ id: 'doc-1', fileName: 'key.pdf' });
      s3.send.mockResolvedValue({});
      Document.destroy.mockResolvedValue(1);
      cache.del.mockResolvedValue(true);

      const res = await request(app).delete('/documents/doc-1');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Document deleted successfully');
    });
  });
});
