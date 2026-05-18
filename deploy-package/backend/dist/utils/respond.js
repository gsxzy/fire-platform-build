"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendFail = sendFail;
exports.sendPage = sendPage;
const response_1 = require("@/utils/response");
/**
 * 控制器统一响应 — 自动携带 requestId，与前端 ApiResponse 对齐
 */
function sendSuccess(res, req, data, msg = '操作成功') {
    return res.json((0, response_1.success)(data, msg, req.reqId));
}
function sendFail(res, req, msg, code = 400) {
    return res.status(code >= 400 ? code : 400).json((0, response_1.fail)(msg, code, req.reqId));
}
function sendPage(res, req, list, total, pageNum, pageSize, msg = '查询成功') {
    return res.json((0, response_1.page)(list, total, pageNum, pageSize, req.reqId));
}
//# sourceMappingURL=respond.js.map