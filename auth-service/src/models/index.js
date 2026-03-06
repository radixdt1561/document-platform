const { Sequelize } = require('sequelize');
const config = require('../config/database')[process.env.NODE_ENV || 'development'];

const sequelize = new Sequelize(config.database, config.username, config.password, config);

const User        = require('./user')(sequelize, Sequelize.DataTypes);
const Role        = require('./role')(sequelize, Sequelize.DataTypes);
const Profile     = require('./profile')(sequelize, Sequelize.DataTypes);
const RefreshToken = require('./refreshToken')(sequelize, Sequelize.DataTypes);
const Permission  = require('./permission')(sequelize, Sequelize.DataTypes);
const RolePermission = require('./rolepermission')(sequelize, Sequelize.DataTypes);

const models = { User, Role, Profile, RefreshToken, Permission, RolePermission, sequelize };
Object.values(models).forEach((m) => m.associate && m.associate(models));

module.exports = models;
