"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const logger_1 = __importDefault(require("./logger"));
const socketPath = process.env.DB_SOCKET_PATH;
const host = process.env.DB_HOST || '127.0.0.1';
const port = parseInt(process.env.DB_PORT || '3306');
if (!process.env.DB_PASSWORD) {
    console.error('[DB] 错误：未设置 DB_PASSWORD 环境变量，系统无法启动');
    process.exit(1);
}
/** 慢查询阈值（毫秒） */
const SLOW_QUERY_MS = parseInt(process.env.DB_SLOW_QUERY_MS || '500', 10);
/** 自定义日志：开发环境输出所有SQL，生产环境只记录慢查询 */
const logging = process.env.NODE_ENV === 'development'
    ? (msg) => console.log(msg)
    : (msg) => {
        // 生产环境：从SQL注释中提取执行时间，慢查询记WARN
        const match = msg.match(/elapsed\s+(\d+)ms/i) || msg.match(/(\d+)ms/);
        const elapsed = match ? parseInt(match[1], 10) : 0;
        if (elapsed > SLOW_QUERY_MS) {
            logger_1.default.warn(`[SlowSQL] ${elapsed}ms > ${SLOW_QUERY_MS}ms: ${msg.slice(0, 500)}`);
        }
    };
const sequelize = new sequelize_1.Sequelize(process.env.DB_NAME || 'fire_platform', process.env.DB_USER || 'fire_user', process.env.DB_PASSWORD, {
    ...(socketPath
        ? { dialectOptions: { socketPath } }
        : { host, port }),
    dialect: 'mysql',
    pool: {
        min: parseInt(process.env.DB_POOL_MIN || '5'),
        max: parseInt(process.env.DB_POOL_MAX || '20'),
        acquire: 60000,
        idle: 10000,
    },
    logging,
    benchmark: process.env.NODE_ENV !== 'development',
    define: {
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
        timestamps: true,
        underscored: true,
        freezeTableName: true,
    },
    timezone: '+08:00',
});
exports.default = sequelize;
//# sourceMappingURL=database.js.map