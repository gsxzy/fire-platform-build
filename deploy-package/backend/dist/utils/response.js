"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.page = exports.fail = exports.success = void 0;
function buildEnvelope(p) {
    const env = {
        code: p.code,
        msg: p.msg,
        message: p.msg,
        data: p.data,
        timestamp: Date.now(),
    };
    if (p.requestId)
        env.requestId = p.requestId;
    return env;
}
const success = (data, msg = '操作成功', requestId) => buildEnvelope({ code: 200, msg, data, requestId });
exports.success = success;
const fail = (msg = '操作失败', code = 400, requestId) => buildEnvelope({ code, msg, data: null, requestId });
exports.fail = fail;
const page = (list, total, pageNum, pageSize, requestId) => buildEnvelope({
    code: 200,
    msg: '查询成功',
    data: { list, total, pageNum, pageSize, pages: Math.ceil(total / pageSize) },
    requestId,
});
exports.page = page;
// 如需从请求自动携带 requestId，请使用 success(data, msg, req.reqId) 或 fail(msg, code, req.reqId)
//# sourceMappingURL=response.js.map