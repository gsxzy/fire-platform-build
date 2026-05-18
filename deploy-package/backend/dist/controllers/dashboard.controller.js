"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const respond_1 = require("@/utils/respond");
const dashboard_service_1 = require("@/services/dashboard.service");
const analysis_service_1 = require("@/services/analysis.service");
const gis_service_1 = require("@/services/gis.service");
const report_service_1 = require("@/services/report.service");
function parseDays(req, fallback = 30) {
    return Math.min(Math.max(parseInt(req.query.days, 10) || fallback, 1), 365);
}
exports.DashboardController = {
    async workbench(req, res) {
        const data = await dashboard_service_1.DashboardService.getWorkbenchData(req.user.userId);
        (0, respond_1.sendSuccess)(res, req, data);
    },
    async monitorOverview(req, res) {
        const data = await dashboard_service_1.DashboardService.getMonitorOverview();
        (0, respond_1.sendSuccess)(res, req, data);
    },
    async bigScreen(req, res) {
        const data = await dashboard_service_1.DashboardService.getBigScreenData();
        (0, respond_1.sendSuccess)(res, req, data);
    },
    async deviceAnalysis(req, res) {
        const data = await analysis_service_1.AnalysisService.deviceAnalysis(parseDays(req));
        (0, respond_1.sendSuccess)(res, req, data);
    },
    async alarmAnalysis(req, res) {
        const data = await analysis_service_1.AnalysisService.alarmAnalysis(parseDays(req));
        (0, respond_1.sendSuccess)(res, req, data);
    },
    async maintenanceAnalysis(req, res) {
        const data = await analysis_service_1.AnalysisService.maintenanceAnalysis();
        (0, respond_1.sendSuccess)(res, req, data);
    },
    async hazardAnalysis(req, res) {
        const data = await analysis_service_1.AnalysisService.hazardAnalysis();
        (0, respond_1.sendSuccess)(res, req, data);
    },
    async patrolCompletion(req, res) {
        const data = await analysis_service_1.AnalysisService.patrolCompletion(parseDays(req));
        (0, respond_1.sendSuccess)(res, req, data);
    },
    async gisPoints(req, res) {
        const data = await gis_service_1.GISService.getMapPoints();
        (0, respond_1.sendSuccess)(res, req, data);
    },
    async gisSituation(req, res) {
        const data = await gis_service_1.GISService.getRegionSituation();
        (0, respond_1.sendSuccess)(res, req, data);
    },
    async gisAlarmPoints(req, res) {
        const data = await gis_service_1.GISService.getAlarmPoints();
        (0, respond_1.sendSuccess)(res, req, data);
    },
    async dailyReport(req, res) {
        const date = req.query.date || new Date().toISOString().slice(0, 10);
        const data = await report_service_1.ReportService.generateDailyReport(date);
        (0, respond_1.sendSuccess)(res, req, data);
    },
    async weeklyReport(req, res) {
        const endDate = req.query.endDate || new Date().toISOString().slice(0, 10);
        const data = await report_service_1.ReportService.generateWeeklyReport(endDate);
        (0, respond_1.sendSuccess)(res, req, data);
    },
    async monthlyReport(req, res) {
        const year = parseInt(req.query.year, 10) || new Date().getFullYear();
        const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
        const data = await report_service_1.ReportService.generateMonthlyReport(year, month);
        (0, respond_1.sendSuccess)(res, req, data);
    },
    async deviceReport(req, res) {
        const unitId = req.query.unitId ? parseInt(req.query.unitId, 10) : undefined;
        const data = await report_service_1.ReportService.generateDeviceReport(unitId);
        (0, respond_1.sendSuccess)(res, req, data);
    },
    async maintenanceReport(req, res) {
        const { startDate, endDate } = req.query;
        const data = await report_service_1.ReportService.generateMaintenanceReport(startDate, endDate);
        (0, respond_1.sendSuccess)(res, req, data);
    },
    async patrolReport(req, res) {
        const { startDate, endDate } = req.query;
        const data = await report_service_1.ReportService.generatePatrolReport(startDate, endDate);
        (0, respond_1.sendSuccess)(res, req, data);
    },
};
//# sourceMappingURL=dashboard.controller.js.map