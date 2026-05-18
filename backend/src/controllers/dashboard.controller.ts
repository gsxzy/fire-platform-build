import type { Request, Response } from 'express';
import { sendSuccess } from '@/utils/respond';
import { DashboardService } from '@/services/dashboard.service';
import { AnalysisService } from '@/services/analysis.service';
import { GISService } from '@/services/gis.service';
import { ReportService } from '@/services/report.service';

function parseDays(req: Request, fallback = 30): number {
  return Math.min(Math.max(parseInt(req.query.days as string, 10) || fallback, 1), 365);
}

export const DashboardController = {
  async workbench(req: Request, res: Response) {
    const data = await DashboardService.getWorkbenchData(req.user!.userId);
    sendSuccess(res, req, data);
  },

  async monitorOverview(req: Request, res: Response) {
    const data = await DashboardService.getMonitorOverview();
    sendSuccess(res, req, data);
  },

  async bigScreen(req: Request, res: Response) {
    const data = await DashboardService.getBigScreenData();
    sendSuccess(res, req, data);
  },

  async bigScreenConfig(req: Request, res: Response) {
    const data = await DashboardService.getBigScreenConfig();
    sendSuccess(res, req, data);
  },

  async deviceAnalysis(req: Request, res: Response) {
    const data = await AnalysisService.deviceAnalysis(parseDays(req));
    sendSuccess(res, req, data);
  },

  async alarmAnalysis(req: Request, res: Response) {
    const data = await AnalysisService.alarmAnalysis(parseDays(req));
    sendSuccess(res, req, data);
  },

  async maintenanceAnalysis(req: Request, res: Response) {
    const data = await AnalysisService.maintenanceAnalysis();
    sendSuccess(res, req, data);
  },

  async hazardAnalysis(req: Request, res: Response) {
    const data = await AnalysisService.hazardAnalysis();
    sendSuccess(res, req, data);
  },

  async patrolCompletion(req: Request, res: Response) {
    const data = await AnalysisService.patrolCompletion(parseDays(req));
    sendSuccess(res, req, data);
  },

  async gisPoints(req: Request, res: Response) {
    const data = await GISService.getMapPoints();
    sendSuccess(res, req, data);
  },

  async gisSituation(req: Request, res: Response) {
    const data = await GISService.getRegionSituation();
    sendSuccess(res, req, data);
  },

  async gisAlarmPoints(req: Request, res: Response) {
    const data = await GISService.getAlarmPoints();
    sendSuccess(res, req, data);
  },

  async gisAlarmHeatmap(req: Request, res: Response) {
    const data = await GISService.getAlarmHeatmap();
    sendSuccess(res, req, data);
  },

  async dailyReport(req: Request, res: Response) {
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const data = await ReportService.generateDailyReport(date);
    sendSuccess(res, req, data);
  },

  async weeklyReport(req: Request, res: Response) {
    const endDate = (req.query.endDate as string) || new Date().toISOString().slice(0, 10);
    const data = await ReportService.generateWeeklyReport(endDate);
    sendSuccess(res, req, data);
  },

  async monthlyReport(req: Request, res: Response) {
    const year = parseInt(req.query.year as string, 10) || new Date().getFullYear();
    const month = parseInt(req.query.month as string, 10) || new Date().getMonth() + 1;
    const data = await ReportService.generateMonthlyReport(year, month);
    sendSuccess(res, req, data);
  },

  async deviceReport(req: Request, res: Response) {
    const unitId = req.query.unitId ? parseInt(req.query.unitId as string, 10) : undefined;
    const data = await ReportService.generateDeviceReport(unitId);
    sendSuccess(res, req, data);
  },

  async maintenanceReport(req: Request, res: Response) {
    const { startDate, endDate } = req.query;
    const data = await ReportService.generateMaintenanceReport(startDate as string, endDate as string);
    sendSuccess(res, req, data);
  },

  async patrolReport(req: Request, res: Response) {
    const { startDate, endDate } = req.query;
    const data = await ReportService.generatePatrolReport(startDate as string, endDate as string);
    sendSuccess(res, req, data);
  },

  async exportReport(req: Request, res: Response) {
    const { type, format = 'csv' } = req.query;
    const result = await ReportService.exportReport(
      String(type || 'daily'),
      {
        date: req.query.date as string,
        endDate: req.query.endDate as string,
        year: req.query.year ? parseInt(req.query.year as string, 10) : undefined,
        month: req.query.month ? parseInt(req.query.month as string, 10) : undefined,
        unitId: req.query.unitId ? parseInt(req.query.unitId as string, 10) : undefined,
        startDate: req.query.startDate as string,
        days: parseDays(req),
        format: String(format),
      }
    );
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    if ('buffer' in result && result.buffer) {
      res.send(result.buffer);
    } else {
      res.send('\uFEFF' + result.content);
    }
  },
};
