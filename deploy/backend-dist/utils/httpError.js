"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpError = void 0;
/**
 * 可预期的 HTTP 业务错误 —— 抛给全局错误中间件统一输出信封
 */
class HttpError extends Error {
    httpStatus;
    businessCode;
    constructor(message, httpStatus = 400, businessCode) {
        super(message);
        this.name = 'HttpError';
        this.httpStatus = httpStatus;
        this.businessCode = businessCode ?? httpStatus;
        Object.setPrototypeOf(this, HttpError.prototype);
    }
}
exports.HttpError = HttpError;
//# sourceMappingURL=httpError.js.map