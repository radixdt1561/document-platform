'use strict';
const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/database')[process.env.NODE_ENV || 'development'];

const sequelize = new Sequelize(config.database, config.username, config.password, config);

const UploadEvent = sequelize.define('UploadEvent', {
  documentId: { type: DataTypes.INTEGER, allowNull: false },
  userId:     { type: DataTypes.INTEGER, allowNull: false },
  fileName:   { type: DataTypes.STRING,  allowNull: false },
  fileUrl:    { type: DataTypes.STRING,  allowNull: false },
  checksum:   { type: DataTypes.STRING,  allowNull: true  },
  scannedAt:  { type: DataTypes.DATE,    defaultValue: DataTypes.NOW }
}, {
  tableName:  'upload_events',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['documentId'] }
  ]
});

module.exports = { sequelize, UploadEvent };
