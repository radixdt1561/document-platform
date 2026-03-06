'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcrypt');
const { encrypt, safeDecrypt } = require('../utils/crypto');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.belongsTo(models.Role, { foreignKey: 'roleId' });
      User.hasOne(models.Profile, { foreignKey: 'userId' });
    }

    // decrypt PII when reading
    get name()  { return safeDecrypt(this.getDataValue('name')); }
    get email() { return safeDecrypt(this.getDataValue('email')); }
  }

  User.init({
    name:          { type: DataTypes.STRING, allowNull: false },
    email:         { type: DataTypes.STRING, allowNull: false, unique: true },
    password:      { type: DataTypes.STRING, allowNull: true },   // null for OAuth users
    provider:      { type: DataTypes.ENUM('local', 'google'), defaultValue: 'local' },
    providerId:    { type: DataTypes.STRING, allowNull: true },
    emailVerified: { type: DataTypes.BOOLEAN, defaultValue: false }
  }, {
    sequelize,
    modelName: 'User',
    timestamps: true
  });

  const encryptPII = (user) => {
    if (user.changed('name'))  user.name  = encrypt(user.getDataValue('name'));
    if (user.changed('email')) user.email = encrypt(user.getDataValue('email'));
  };

  const hashPassword = async (user) => {
    if (user.changed('password') && user.getDataValue('password')) {
      user.password = await bcrypt.hash(user.getDataValue('password'), 10);
    }
  };

  User.beforeCreate(async (user) => { encryptPII(user); await hashPassword(user); });
  User.beforeUpdate(async (user) => { encryptPII(user); await hashPassword(user); });

  return User;
};
