"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DispatchController = void 0;
const response_1 = require("@/utils/response");
const dispatch_service_1 = require("@/services/dispatch.service");
const validator_1 = require("@/utils/validator");
const cache_1 = require("@/utils/cache");
exports.DispatchController = {
    async list(req, res) {
        const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
        const { status, phase, alarmType, keyword, startTime, endTime, handlerId } = req.query;
        const data = await dispatch_service_1.DispatchService.list({
            status: status,
            phase: phase,
            alarmType: alarmType ? +alarmType : undefined,
            keyword: keyword,
            startTime: startTime,
            endTime: endTime,
            handlerId: handlerId ? +handlerId : undefined,
            pageNum: +pageNum, pageSize: +pageSize,
        });
        (0, response_1.sendPage)(res, req, data.list, data.total, data.pageNum, data.pageSize);
    },
    async byId(req, res) {
        const row = await dispatch_service_1.DispatchService.byId(req.params.id);
        (0, response_1.sendSuccess)(res, req, row);
    },
    async stats(req, res) {
        const data = await (0, cache_1.withCache)(cache_1.CacheTags.DASHBOARD, 'dispatch:stats', async () => {
            return dispatch_service_1.DispatchService.stats();
        }, { ttl: 60 });
        (0, response_1.sendSuccess)(res, req, data);
    },
    /** 派单 */
    async dispatch(req, res) {
        const { handlerId, handlerName, note } = req.body;
        const result = await dispatch_service_1.DispatchService.dispatch(String((0, validator_1.parseIdStrict)(req.params.id)), +handlerId, handlerName, note);
        (0, response_1.sendSuccess)(res, req, result, '派单成功');
    },
    /** 转派 */
    async transfer(req, res) {
        const { newHandlerId, newHandlerName, note } = req.body;
        const result = await dispatch_service_1.DispatchService.transfer(String((0, validator_1.parseIdStrict)(req.params.id)), +newHandlerId, newHandlerName, note);
        (0, response_1.sendSuccess)(res, req, result, '转派成功');
    },
    /** 开始处置 */
    async startHandling(req, res) {
        const { note } = req.body;
        const result = await dispatch_service_1.DispatchService.startHandling(String((0, validator_1.parseIdStrict)(req.params.id)), note);
        (0, response_1.sendSuccess)(res, req, result, '已开始处置');
    },
    /** 完成处置 */
    async resolve(req, res) {
        const { result, note } = req.body;
        const data = await dispatch_service_1.DispatchService.resolve(String((0, validator_1.parseIdStrict)(req.params.id)), result, note);
        (0, response_1.sendSuccess)(res, req, data, '处置完成');
    },
    /** 标记误报 */
    async markFalseAlarm(req, res) {
        const { note } = req.body;
        const result = await dispatch_service_1.DispatchService.markFalseAlarm(String((0, validator_1.parseIdStrict)(req.params.id)), note);
        (0, response_1.sendSuccess)(res, req, result, '已标记误报');
    },
    /** 从告警创建处置记录（Webhook/内部调用） */
    async createFromAlarm(req, res) {
        const record = await dispatch_service_1.DispatchService.createFromAlarm(req.body);
        (0, response_1.sendSuccess)(res, req, { id: record.id }, '接警记录创建成功');
    },
};
//# sourceMappingURL=dispatch.controller.js.map