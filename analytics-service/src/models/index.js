const { Sequelize } = require('sequelize');
const config = require('../config/database')[process.env.NODE_ENV || 'development'];

const sequelize = new Sequelize(config.database, config.username, config.password, config);

const User    = require('./user')(sequelize, Sequelize.DataTypes);
const Role    = require('./role')(sequelize, Sequelize.DataTypes);
const Profile = require('./profile')(sequelize, Sequelize.DataTypes);

// UploadEvent is written by worker-service; analytics-service reads it
const UploadEvent = sequelize.define('UploadEvent', {
  documentId: { type: Sequelize.DataTypes.INTEGER },
  userId:     { type: Sequelize.DataTypes.INTEGER },
  fileName:   { type: Sequelize.DataTypes.STRING  },
  fileUrl:    { type: Sequelize.DataTypes.STRING  },
  checksum:   { type: Sequelize.DataTypes.STRING  },
  scannedAt:  { type: Sequelize.DataTypes.DATE    }
}, { tableName: 'upload_events', timestamps: true });

const models = { User, Role, Profile, UploadEvent, sequelize };
Object.values(models).forEach((m) => m.associate && m.associate(models));

module.exports = models;
