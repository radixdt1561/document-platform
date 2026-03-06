'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RefreshToken extends Model {}

  RefreshToken.init({
    token: { type: DataTypes.TEXT, allowNull: false, unique: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false }
  }, {
    sequelize,
    modelName: 'RefreshToken',
    timestamps: true
  });

  RefreshToken.associate = function(models) {
    RefreshToken.belongsTo(models.User, { foreignKey: 'userId' });
  };

  return RefreshToken;
};
