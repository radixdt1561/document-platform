jest.mock('../../src/models/uploadEvent', () => ({
  UploadEvent: {
    create: jest.fn(),
    update: jest.fn(),
  },
}));
jest.mock('../../src/services/workerService', () => ({ runFileWorker: jest.fn() }));
jest.mock('../../src/workers/fileProcessor', () => jest.fn());
jest.mock('../../src/utils/logger', () => ({ info: jest.fn(), error: jest.fn() }));

const { UploadEvent } = require('../../src/models/uploadEvent');
const { runFileWorker } = require('../../src/services/workerService');
const processFile = require('../../src/workers/fileProcessor');
const { handleAnalytics } = require('../../src/handlers/analyticsHandler');
const { handleNotification } = require('../../src/handlers/notificationHandler');
const { handleVirusScan } = require('../../src/handlers/virusScanHandler');

describe('worker handlers', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('handleAnalytics', () => {
    it('creates an UploadEvent record', async () => {
      UploadEvent.create.mockResolvedValue({ id: 1 });
      const data = { documentId: 10, userId: 2, fileName: 'test.pdf', fileUrl: 'https://s3/test.pdf' };

      await handleAnalytics(data);

      expect(UploadEvent.create).toHaveBeenCalledWith({
        documentId: 10,
        userId: 2,
        fileName: 'test.pdf',
        fileUrl: 'https://s3/test.pdf',
      });
    });

    it('propagates DB errors', async () => {
      UploadEvent.create.mockRejectedValue(new Error('DB error'));
      await expect(handleAnalytics({ documentId: 1, userId: 1, fileName: 'f', fileUrl: 'u' }))
        .rejects.toThrow('DB error');
    });
  });

  describe('handleNotification', () => {
    it('resolves without error', async () => {
      await expect(handleNotification({ userId: 1 })).resolves.toBeUndefined();
    });
  });

  describe('handleVirusScan', () => {
    it('runs worker and processFile, then updates UploadEvent', async () => {
      runFileWorker.mockResolvedValue({ status: 'clean' });
      processFile.mockResolvedValue('abc123');
      UploadEvent.update.mockResolvedValue([1]);

      const result = await handleVirusScan({ fileName: 'test.pdf', documentId: 10 });

      expect(runFileWorker).toHaveBeenCalledWith({ fileName: 'test.pdf' });
      expect(processFile).toHaveBeenCalledWith('test.pdf');
      expect(UploadEvent.update).toHaveBeenCalledWith(
        { checksum: 'abc123', scannedAt: expect.any(Date) },
        { where: { documentId: 10 } }
      );
      expect(result).toEqual({ workerResult: { status: 'clean' }, checksum: 'abc123' });
    });

    it('propagates errors from worker', async () => {
      runFileWorker.mockRejectedValue(new Error('Worker failed'));
      processFile.mockResolvedValue('abc123');

      await expect(handleVirusScan({ fileName: 'test.pdf', documentId: 10 }))
        .rejects.toThrow('Worker failed');
    });
  });
});
