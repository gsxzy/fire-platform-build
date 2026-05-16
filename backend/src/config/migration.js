/**
 * Sequelize CLI 配置文件
 * 用于数据库迁移 (db:migrate / db:migrate:undo)
 *
 * 注意：此文件为 CommonJS 格式，因为 sequelize-cli 不支持 ESM 配置
 */
require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'fire_user',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'fire_platform',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    dialectOptions: {
      charset: 'utf8mb4',
    },
    logging: console.log,
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },
  },
  production: {
    username: process.env.DB_USER || 'fire_user',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'fire_platform',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    dialectOptions: {
      charset: 'utf8mb4',
    },
    logging: false,
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },
  },
};
