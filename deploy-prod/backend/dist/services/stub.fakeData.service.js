"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sipServerStart = sipServerStart;
exports.sipServerStop = sipServerStop;
exports.subsystems = subsystems;
exports.dutyCurrentCompat = dutyCurrentCompat;
const database_1 = __importDefault(require("@/config/database"));
const logger_1 = __importDefault(require("@/config/logger"));
const stub_oldTable_service_1 = require("./stub.oldTable.service");
const response_1 = require("@/utils/response");
/* ───── 404 辅助 ───── */
function notImplemented(_req, res) {
    res.status(404).json((0, response_1.fail)('Not Implemented', 404));
}
/* ═══════════════════════════════════════════════════════════
   19. SIP 服务器控制（虚拟状态）
   ═══════════════════════════════════════════════════════════ */
async function sipServerStart(req, res) {
    (0, stub_oldTable_service_1.setSipServerRunning)(true);
    res.json((0, stub_oldTable_service_1.ok)({ running: true }, 'SIP服务已标记为运行'));
}
async function sipServerStop(req, res) {
    (0, stub_oldTable_service_1.setSipServerRunning)(false);
    res.json((0, stub_oldTable_service_1.ok)({ running: false }, 'SIP服务已标记为停止'));
}
/* ═══════════════════════════════════════════════════════════
   21. 子系统 /subsystems
   ═══════════════════════════════════════════════════════════ */
async function subsystems(req, res) {
    try {
        const [[stats]] = await database_1.default.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(CASE WHEN status = 1 THEN 1 END) AS online,
        COUNT(CASE WHEN status = 3 THEN 1 END) AS alarm
      FROM fire_device
      WHERE device_type IS NOT NULL AND device_type != ''
    `);
        const total = Number(stats?.total) || 0;
        const online = Number(stats?.online) || 0;
        const alarm = Number(stats?.alarm) || 0;
        const now = new Date().toLocaleString('zh-CN', { hour12: false });
        const baseDevices = Math.max(1, Math.floor(total / 3));
        const baseOnline = Math.max(0, Math.floor(online / 3));
        const baseAlarm = Math.max(0, Math.floor(alarm / 3));
        const list = [
            {
                id: 'sub-water',
                name: '消防给水系统',
                type: 'water',
                unit: '1号楼',
                devices: baseDevices + (total % 3),
                online: baseOnline + (online % 3),
                status: (baseAlarm + (alarm % 3) > 0) ? 'fault' : (baseOnline + (online % 3) < baseDevices + (total % 3)) ? 'warning' : 'normal',
                lastUpdate: now,
            },
            {
                id: 'sub-elec',
                name: '电气火灾监控',
                type: 'elec',
                unit: '2号楼',
                devices: baseDevices,
                online: baseOnline,
                status: baseAlarm > 0 ? 'fault' : (baseOnline < baseDevices) ? 'warning' : 'normal',
                lastUpdate: now,
            },
            {
                id: 'sub-vent',
                name: '防排烟系统',
                type: 'vent',
                unit: '地下车库',
                devices: baseDevices,
                online: baseOnline,
                status: baseAlarm > 0 ? 'fault' : (baseOnline < baseDevices) ? 'warning' : 'normal',
                lastUpdate: now,
            },
        ];
        res.json((0, stub_oldTable_service_1.ok)(list));
    }
    catch (err) {
        logger_1.default.warn('[Stub] catch error:', err?.message || err);
        res.json((0, stub_oldTable_service_1.ok)([]));
    }
}
/* ═══════════════════════════════════════════════════════════
   32. 值班当前 /duty/current
   ═══════════════════════════════════════════════════════════ */
async function dutyCurrentCompat(req, res) {
    notImplemented(req, res);
}
//# sourceMappingURL=stub.fakeData.service.js.map