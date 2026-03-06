jest.mock('../../src/models', () => ({
  Document: {
    findAndCountAll: jest.fn(),
    findOne:         jest.fn(),
    destroy:         jest.fn(),
  },
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

const { Document }     = require('../../src/models');
const cache            = require('../../src/utils/cache');
const { handleUpload } = require('../../src/services/documentService');
const s3               = require('../../src/config/aws');
const {
  listDocuments, getUploadUrl, uploadDocument, getDocument, deleteDocument,
} = require('../../src/controllers/document.controller');

const mockReq  = (o = {}) => ({ user: { id: 'user-1' }, query: {}, params: {}, body: {}, file: null, ...o });
const mockRes  = () => { const r = {}; r.json = jest.fn(() => r); r.status = jest.fn(() => r); return r; };
const mockNext = jest.fn();

describe('document.controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('listDocuments', () => {
    it('returns cached response if available', async () => {
      cache.get.mockResolvedValue({ total: 1, documents: [] });
      const res = mockRes();
      await listDocuments(mockReq(), res, mockNext);
      expect(res.json).toHaveBeenCalledWith({ total: 1, documents: [] });
      expect(Document.findAndCountAll).not.toHaveBeenCalled();
    });

    it('queries DB and caches on miss', async () => {
      cache.get.mockResolvedValue(null);
      Document.findAndCountAll.mockResolvedValue({ count: 2, rows: [{ id: 'doc-1' }] });
      const res = mockRes();
      await listDocuments(mockReq({ query: { page: '1', limit: '10' } }), res, mockNext);
      expect(Document.findAndCountAll).toHaveBeenCalled();
      expect(cache.set).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ total: 2 }));
    });
  });

  describe('getUploadUrl', () => {
    it('calls next with 400 if fields missing', async () => {
      await getUploadUrl(mockReq({ body: {} }), mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('returns presigned url', async () => {
      process.env.AWS_BUCKET = 'test-bucket';
      const res = mockRes();
      await getUploadUrl(mockReq({ body: { fileName: 'a.pdf', contentType: 'application/pdf' } }), res, mockNext);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://s3.url/key' }));
    });
  });

  describe('uploadDocument', () => {
    it('creates document and invalidates cache', async () => {
      handleUpload.mockResolvedValue({ id: 'doc-1' });
      const req = mockReq({ file: { key: 'user-1/file.pdf', location: 'https://s3.url/file.pdf' } });
      const res = mockRes();
      await uploadDocument(req, res, mockNext);
      expect(handleUpload).toHaveBeenCalledWith({
        userId: 'user-1', fileName: 'user-1/file.pdf', fileUrl: 'https://s3.url/file.pdf',
      });
      expect(cache.del).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'File uploaded successfully' }));
    });
  });

  describe('getDocument', () => {
    it('calls next with 404 if not found', async () => {
      cache.get.mockResolvedValue(null);
      Document.findOne.mockResolvedValue(null);
      await getDocument(mockReq({ params: { id: 'doc-99' } }), mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    });

    it('returns signed url for existing document', async () => {
      cache.get.mockResolvedValue(null);
      Document.findOne.mockResolvedValue({ id: 'doc-1', fileName: 'key.pdf', fileUrl: 'url' });
      const res = mockRes();
      await getDocument(mockReq({ params: { id: 'doc-1' } }), res, mockNext);
      expect(res.json).toHaveBeenCalledWith({ url: 'https://s3.url/key' });
    });
  });

  describe('deleteDocument', () => {
    it('calls next with 404 if not found', async () => {
      Document.findOne.mockResolvedValue(null);
      await deleteDocument(mockReq({ params: { id: 'doc-99' } }), mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    });

    it('deletes from S3, DB, and cache', async () => {
      Document.findOne.mockResolvedValue({ id: 'doc-1', fileName: 'key.pdf' });
      s3.send.mockResolvedValue({});
      Document.destroy.mockResolvedValue(1);
      cache.del.mockResolvedValue(true);
      const res = mockRes();
      await deleteDocument(mockReq({ params: { id: 'doc-1' } }), res, mockNext);
      expect(s3.send).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Document deleted successfully' });
    });
  });
});
