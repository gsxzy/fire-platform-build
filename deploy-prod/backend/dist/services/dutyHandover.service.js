"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DutyHandoverService = void 0;
const sequelize_1 = require("sequelize");
const models_1 = require("@/models");
const noGenerator_1 = require("@/utils/noGenerator");
class DutyHandoverService {
    static async create(data) {
        const handoverNo = await (0, noGenerator_1.generateNo)('JH');
        return models_1.DutyHandover.create({ ...data, handover_no: handoverNo });
    }
    static async list(params) {
        const { startTime, endTime, shiftId, fromUserId, toUserId, status, pageNum = 1, pageSize = 20 } = params;
        const where = {};
        if (startTime && endTime) {
            where.handover_time = { [sequelize_1.Op.between]: [startTime, endTime] };
        }
        if (shiftId)
            where.shift_id = shiftId;
        if (fromUserId)
            where.from_user_id = fromUserId;
        if (toUserId)
            where.to_user_id = toUserId;
        if (status !== undefined)
            where.status = status;
        const { count, rows } = await models_1.DutyHandover.findAndCountAll({
            where, limit: pageSize, offset: (pageNum - 1) * pageSize,
            order: [['handover_time', 'DESC']],
        });
        return { list: rows, total: count, pageNum, pageSize };
    }
    static async byId(id) {
        return models_1.DutyHandover.findByPk(id);
    }
    static async accept(id, toUserId, toUserName, toSignature) {
        return models_1.DutyHandover.update({
            to_user_id: toUserId,
            to_user_name: toUserName,
            to_signature: toSignature,
            accept_time: new Date(),
            status: 1,
        }, { where: { id } });
    }
    /** 获取当前班次待交接的汇总数据 */
    static async getHandoverSummary(scheduleId) {
        const schedule = await models_1.DutySchedule.findByPk(scheduleId);
        if (!schedule)
            return null;
        // 查询当班期间产生的未处置告警数（通过 dispatch_record 统计）
        const { DispatchRecord } = await Promise.resolve().then(() => __importStar(require('@/models')));
        const pendingAlarms = await DispatchRecord.count({
            where: {
                status: { [sequelize_1.Op.in]: ['new', 'dispatched', 'handling'] },
                created_at: { [sequelize_1.Op.gte]: schedule.on_duty_time || schedule.created_at },
            },
        });
        // 查询当班日志
        const logs = await models_1.DutyLog.findAll({
            where: {
                schedule_id: scheduleId,
            },
            order: [['created_at', 'DESC']],
            limit: 50,
        });
        return {
            schedule,
            pendingAlarms,
            logCount: logs.length,
            logs,
        };
    }
}
exports.DutyHandoverService = DutyHandoverService;
//# sourceMappingURL=dutyHandover.service.js.map