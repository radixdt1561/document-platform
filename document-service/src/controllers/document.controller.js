const s3 = require('../config/aws');
const { handleUpload } = require('../services/documentService');
const { Document } = require('../models');
const cache = require('../utils/cache');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

// GET /documents — paginated list, lean projection, cached per user+page
const listDocuments = async (req, res, next) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(50, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;
    const cacheKey = `documents:${req.user.id}:${page}:${limit}`;

    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const { count, rows: documents } = await Document.findAndCountAll({
      where:      { userId: req.user.id },
      attributes: ['id', 'fileName', 'fileUrl', 'createdAt'], // projection — skip unused cols
      order:      [['createdAt', 'DESC']],
      limit,
      offset,
      raw: true   // skip model instantiation overhead
    });

    const response = { total: count, page, limit, documents };
    await cache.set(cacheKey, response, 30);
    res.json(response);
  } catch (error) { next(error); }
};

// POST /documents/upload-url — generate presigned S3 URL (no server-side upload)
const getUploadUrl = async (req, res, next) => {
  try {
    const { fileName, contentType } = req.body;
    if (!fileName || !contentType)
      return next(new AppError('fileName and contentType are required', 400));

    const key = `${req.user.id}/${Date.now()}-${fileName}`;
    const url = s3.getSignedUrl('putObject', {
      Bucket:      process.env.AWS_BUCKET,
      Key:         key,
      ContentType: contentType,
      Expires:     300
    });

    res.json({ url, key });
  } catch (error) { next(error); }
};

// POST /documents/upload — multipart upload via server
const uploadDocument = async (req, res, next) => {
  try {
    const { key, location } = req.file;
    const document = await handleUpload({ userId: req.user.id, fileName: key, fileUrl: location });
    await cache.del(`documents:${req.user.id}:1:10`); // invalidate first page cache
    res.json({ message: 'File uploaded successfully', document });
  } catch (error) { next(error); }
};

// GET /documents/:id
const getDocument = async (req, res, next) => {
  try {
    const cacheKey = `document:${req.params.id}:${req.user.id}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const document = await Document.findOne({
      where:      { id: req.params.id, userId: req.user.id },
      attributes: ['id', 'fileName', 'fileUrl'],
      raw: true
    });
    if (!document) return next(new AppError('Document not found', 404));

    const url = s3.getSignedUrl('getObject', {
      Bucket: process.env.AWS_BUCKET,
      Key:    document.fileName,
      Expires: 60
    });

    const response = { url };
    await cache.set(cacheKey, response, 60);
    res.json(response);
  } catch (error) { next(error); }
};

// DELETE /documents/:id
const deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne({
      where:      { id: req.params.id, userId: req.user.id },
      attributes: ['id', 'fileName'],
      raw: true
    });
    if (!document) return next(new AppError('Document not found', 404));

    await Promise.all([
      s3.deleteObject({ Bucket: process.env.AWS_BUCKET, Key: document.fileName }).promise(),
      Document.destroy({ where: { id: document.id } }),
      cache.del(`document:${req.params.id}:${req.user.id}`)
    ]);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) { next(error); }
};

module.exports = { listDocuments, getUploadUrl, uploadDocument, getDocument, deleteDocument };
