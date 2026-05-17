"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const response_1 = require("@/utils/response");
const logger_1 = __importDefault(require("@/config/logger"));
const dashboard_service_1 = require("@/services/dashboard.service");
const analysis_service_1 = require("@/services/analysis.service");
const gis_service_1 = require("@/services/gis.service");
const report_service_1 = require("@/services/report.service");
exports.DashboardController = {
    // 工作台首页
    async workbench(req, res) {
        try {
            const data = await dashboard_service_1.DashboardService.getWorkbenchData(req.user.userId);
            return res.json((0, response_1.success)(data));
        }
        catch (err) {
            logger_1.default.error(`[Dashboard] workbench 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    // 监控中心总览
    async monitorOverview(req, res) {
        try {
            const data = await dashboard_service_1.DashboardService.getMonitorOverview();
            return res.json((0, response_1.success)(data));
        }
        catch (err) {
            logger_1.default.error(`[Dashboard] monitorOverview 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    // 大屏数据
    async bigScreen(req, res) {
        try {
            const data = await dashboard_service_1.DashboardService.getBigScreenData();
            return res.json((0, response_1.success)(data));
        }
        catch (err) {
            logger_1.default.error(`[Dashboard] bigScreen 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    // 数据分析
    async deviceAnalysis(req, res) {
        try {
            const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 365);
            const data = await analysis_service_1.AnalysisService.deviceAnalysis(days);
            return res.json((0, response_1.success)(data));
        }
        catch (err) {
            logger_1.default.error(`[Dashboard] deviceAnalysis 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async alarmAnalysis(req, res) {
        try {
            const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 365);
            const data = await analysis_service_1.AnalysisService.alarmAnalysis(days);
            return res.json((0, response_1.success)(data));
        }
        catch (err) {
            logger_1.default.error(`[Dashboard] alarmAnalysis 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async maintenanceAnalysis(req, res) {
        try {
            const data = await analysis_service_1.AnalysisService.maintenanceAnalysis();
            return res.json((0, response_1.success)(data));
        }
        catch (err) {
            logger_1.default.error(`[Dashboard] maintenanceAnalysis 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async hazardAnalysis(req, res) {
        try {
            const data = await analysis_service_1.AnalysisService.hazardAnalysis();
            return res.json((0, response_1.success)(data));
        }
        catch (err) {
            logger_1.default.error(`[Dashboard] hazardAnalysis 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async patrolCompletion(req, res) {
        try {
            const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 365);
            const data = await analysis_service_1.AnalysisService.patrolCompletion(days);
            return res.json((0, response_1.success)(data));
        }
        catch (err) {
            logger_1.default.error(`[Dashboard] patrolCompletion 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    // GIS地图
    async gisPoints(req, res) {
        try {
            const data = await gis_service_1.GISService.getMapPoints();
            return res.json((0, response_1.success)(data));
        }
        catch (err) {
            logger_1.default.error(`[Dashboard] gisPoints 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async gisSituation(req, res) {
        try {
            const data = await gis_service_1.GISService.getRegionSituation();
            return res.json((0, response_1.success)(data));
        }
        catch (err) {
            logger_1.default.error(`[Dashboard] gisSituation 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async gisAlarmPoints(req, res) {
        try {
            const data = await gis_service_1.GISService.getAlarmPoints();
            return res.json((0, response_1.success)(data));
        }
        catch (err) {
            logger_1.default.error(`[Dashboard] gisAlarmPoints 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    // 报表
    async dailyReport(req, res) {
        try {
            const date = req.query.date || new Date().toISOString().slice(0, 10);
            const data = await report_service_1.ReportService.generateDailyReport(date);
            return res.json((0, response_1.success)(data));
        }
        catch (err) {
            logger_1.default.error(`[Dashboard] dailyReport 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async weeklyReport(req, res) {
        try {
            const endDate = req.query.endDate || new Date().toISOString().slice(0, 10);
            const data = await report_service_1.ReportService.generateWeeklyReport(endDate);
            return res.json((0, response_1.success)(data));
        }
        catch (err) {
            logger_1.default.error(`[Dashboard] weeklyReport 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async monthlyReport(req, res) {
        try {
            const year = parseInt(req.query.year) || new Date().getFullYear();
            const month = parseInt(req.query.month) || new Date().getMonth() + 1;
            const data = await report_service_1.ReportService.generateMonthlyReport(year, month);
            return res.json((0, response_1.success)(data));
        }
        catch (err) {
            logger_1.default.error(`[Dashboard] monthlyReport 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async deviceReport(req, res) {
        try {
            const unitId = req.query.unitId ? parseInt(req.query.unitId) : undefined;
            const data = await report_service_1.ReportService.generateDeviceReport(unitId);
            return res.json((0, response_1.success)(data));
        }
        catch (err) {
            logger_1.default.error(`[Dashboard] deviceReport 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async maintenanceReport(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const data = await report_service_1.ReportService.generateMaintenanceReport(startDate, endDate);
            return res.json((0, response_1.success)(data));
        }
        catch (err) {
            logger_1.default.error(`[Dashboard] maintenanceReport 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async patrolReport(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const data = await report_service_1.ReportService.generatePatrolReport(startDate, endDate);
            return res.json((0, response_1.success)(data));
        }
        catch (err) {
            logger_1.default.error(`[Dashboard] patrolReport 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
};
//# sourceMappingURL=dashboard.controller.js.map