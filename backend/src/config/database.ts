import { Sequelize } from 'sequelize';

const socketPath = process.env.DB_SOCKET_PATH;
const host = process.env.DB_HOST || '127.0.0.1';
const port = parseInt(process.env.DB_PORT || '5432');

if (!process.env.DB_PASSWORD) {
  console.error('[DB] 错误：未设置 DB_PASSWORD 环境变量，系统无法启动');
  process.exit(1);
}

const sequelize = new Sequelize(
  process.env.DB_NAME || 'fire_platform',
  process.env.DB_USER || 'fire_user',
  process.env.DB_PASSWORD,
  {
    ...(socketPath
      ? { dialectOptions: { socketPath } }
      : { host, port }),
    dialect: 'postgres',
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '5'),
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      acquire: 60000,
      idle: 10000,
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },
    timezone: '+08:00',
  }
);

export default sequelize;
