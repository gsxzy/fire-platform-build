"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const path_1 = __importDefault(require("path"));
const LOG_DIR = process.env.LOG_DIR || './logs';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const logger = winston_1.default.createLogger({
    level: LOG_LEVEL,
    format: winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    defaultMeta: { service: 'fire-platform' },
    transports: [
        new winston_daily_rotate_file_1.default({
            filename: path_1.default.join(LOG_DIR, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxSize: '20m',
            maxFiles: '30d',
        }),
        new winston_daily_rotate_file_1.default({
            filename: path_1.default.join(LOG_DIR, 'combined-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '50m',
            maxFiles: '30d',
        }),
    ],
});
if (process.env.NODE_ENV === 'development') {
    logger.add(new winston_1.default.transports.Console({
        format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple()),
    }));
}
exports.default = logger;
//# sourceMappingURL=logger.js.map