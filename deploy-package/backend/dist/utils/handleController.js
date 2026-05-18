"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleController = handleController;
const logger_1 = __importDefault(require("@/config/logger"));
const httpError_1 = require("@/utils/httpError");
const respond_1 = require("@/utils/respond");
/**
 * 包装控制器：统一捕获异常并输出标准信封（配合 sendSuccess / sendFail）
 */
function handleController(label, fn) {
    return async (req, res, next) => {
        try {
            await fn(req, res);
        }
        catch (err) {
            const e = err;
            logger_1.default.error(`[${label}] ${e?.message || err}`);
            if (err instanceof httpError_1.HttpError) {
                return (0, respond_1.sendFail)(res, req, err.message, err.httpStatus);
            }
            return (0, respond_1.sendFail)(res, req, e?.message || '服务器内部错误', e?.businessCode ?? 500);
        }
    };
}
//# sourceMappingURL=handleController.js.map