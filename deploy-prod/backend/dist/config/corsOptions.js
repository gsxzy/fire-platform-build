"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCorsOptions = getCorsOptions;
const logger_1 = __importDefault(require("@/config/logger"));
function getCorsOptions() {
    const raw = process.env.CORS_ORIGIN?.trim();
    if (!raw) {
        if (process.env.NODE_ENV === 'production') {
            logger_1.default.error('[SECURITY] ❌ 生产环境必须配置 CORS_ORIGIN，否则存在 CSRF 风险。服务已拒绝启动。');
            process.exit(1);
        }
        return { origin: true, credentials: true };
    }
    const list = raw.split(',').map(s => s.trim()).filter(Boolean);
    return {
        credentials: true,
        origin(origin, callback) {
            if (!origin) {
                callback(null, true);
                return;
            }
            if (list.includes('*') || list.includes(origin)) {
                callback(null, true);
                return;
            }
            logger_1.default.warn(`[CORS] 拒绝来源: ${origin}`);
            callback(null, false);
        },
    };
}
//# sourceMappingURL=corsOptions.js.map