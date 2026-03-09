const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3 = require('../config/aws');
const { handleUpload } = require('../services/documentService');
const { Document } = require('../models');
const cache = require('../utils/cache');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

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
      attributes: ['id', 'fileName', 'fileUrl', 'createdAt'],
      order:      [['createdAt', 'DESC']],
      limit,
      offset,
      raw: true,
    });

    const response = { total: count, page, limit, documents };
    await cache.set(cacheKey, response, 30);
    res.json(response);
  } catch (error) { next(error); }
};

const getUploadUrl = async (req, res, next) => {
  try {
    const { fileName, contentType } = req.body;
    if (!fileName || !contentType)
      return next(new AppError('fileName and contentType are required', 400));

    const key = `${req.user.id}/${Date.now()}-${fileName}`;
    const url = await getSignedUrl(s3, new PutObjectCommand({
      Bucket:      process.env.AWS_BUCKET,
      Key:         key,
      ContentType: contentType,
    }), { expiresIn: 300 });

    res.json({ url, key });
  } catch (error) { next(error); }
};

const uploadDocument = async (req, res, next) => {
  try {
    const { key, location } = req.file;
    const document = await handleUpload({ userId: req.user.id, fileName: key, fileUrl: location });
    await cache.del(`documents:${req.user.id}:1:10`);
    res.json({ message: 'File uploaded successfully', document });
  } catch (error) { next(error); }
};

const getDocument = async (req, res, next) => {
  try {
    const cacheKey = `document:${req.params.id}:${req.user.id}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const document = await Document.findOne({
      where:      { id: req.params.id, userId: req.user.id },
      attributes: ['id', 'fileName', 'fileUrl'],
      raw: true,
    });
    if (!document) return next(new AppError('Document not found', 404));

    const url = await getSignedUrl(s3, new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET,
      Key:    document.fileName,
    }), { expiresIn: 60 });

    const response = { url };
    await cache.set(cacheKey, response, 60);
    res.json(response);
  } catch (error) { next(error); }
};

const deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne({
      where:      { id: req.params.id, userId: req.user.id },
      attributes: ['id', 'fileName'],
      raw: true,
    });
    if (!document) return next(new AppError('Document not found', 404));

    await Promise.all([
      s3.send(new DeleteObjectCommand({ Bucket: process.env.AWS_BUCKET, Key: document.fileName })),
      Document.destroy({ where: { id: document.id } }),
      cache.del(`document:${req.params.id}:${req.user.id}`),
    ]);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) { next(error); }
};

module.exports = { listDocuments, getUploadUrl, uploadDocument, getDocument, deleteDocument };
