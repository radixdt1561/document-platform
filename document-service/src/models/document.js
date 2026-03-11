'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Document extends Model {
    static associate(_models) {}
  }

  Document.init({
    userId:   { type: DataTypes.INTEGER, allowNull: false },
    fileName: { type: DataTypes.STRING,  allowNull: false },
    fileUrl:  { type: DataTypes.STRING,  allowNull: false }
  }, {
    sequelize,
    modelName: 'Document',
    indexes: [
      { fields: ['userId'] },                      // fast user document lookups
      { fields: ['userId', 'createdAt'] },          // fast paginated list queries
      { fields: ['fileName'], unique: true }        // prevent duplicate file names
    ]
  });

  return Document;
};
