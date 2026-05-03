import type { Request, Response } from 'express';
import { success } from '@/utils/response';
import { DashboardService } from '@/services/dashboard.service';
import { AnalysisService } from '@/services/analysis.service';
import { GISService } from '@/services/gis.service';
import { ReportService } from '@/services/report.service';

export const DashboardController = {
  // 工作台首页
  async workbench(req: Request, res: Response) {
    const data = await DashboardService.getWorkbenchData(req.user!.userId);
    return res.json(success(data));
  },

  // 监控中心总览
  async monitorOverview(req: Request, res: Response) {
    const data = await DashboardService.getMonitorOverview();
    return res.json(success(data));
  },

  // 大屏数据
  async bigScreen(req: Request, res: Response) {
    const data = await DashboardService.getBigScreenData();
    return res.json(success(data));
  },

  // 数据分析
  async deviceAnalysis(req: Request, res: Response) {
    const days = parseInt(req.query.days as string) || 30;
    const data = await AnalysisService.deviceAnalysis(days);
    return res.json(success(data));
  },

  async alarmAnalysis(req: Request, res: Response) {
    const days = parseInt(req.query.days as string) || 30;
    const data = await AnalysisService.alarmAnalysis(days);
    return res.json(success(data));
  },

  async maintenanceAnalysis(req: Request, res: Response) {
    const data = await AnalysisService.maintenanceAnalysis();
    return res.json(success(data));
  },

  async hazardAnalysis(req: Request, res: Response) {
    const data = await AnalysisService.hazardAnalysis();
    return res.json(success(data));
  },

  async patrolCompletion(req: Request, res: Response) {
    const days = parseInt(req.query.days as string) || 30;
    const data = await AnalysisService.patrolCompletion(days);
    return res.json(success(data));
  },

  // GIS地图
  async gisPoints(req: Request, res: Response) {
    const data = await GISService.getMapPoints();
    return res.json(success(data));
  },

  async gisSituation(req: Request, res: Response) {
    const data = await GISService.getRegionSituation();
    return res.json(success(data));
  },

  async gisAlarmPoints(req: Request, res: Response) {
    const data = await GISService.getAlarmPoints();
    return res.json(success(data));
  },

  // 报表
  async dailyReport(req: Request, res: Response) {
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const data = await ReportService.generateDailyReport(date);
    return res.json(success(data));
  },

  async weeklyReport(req: Request, res: Response) {
    const endDate = (req.query.endDate as string) || new Date().toISOString().slice(0, 10);
    const data = await ReportService.generateWeeklyReport(endDate);
    return res.json(success(data));
  },

  async monthlyReport(req: Request, res: Response) {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const data = await ReportService.generateMonthlyReport(year, month);
    return res.json(success(data));
  },

  async deviceReport(req: Request, res: Response) {
    const unitId = req.query.unitId ? parseInt(req.query.unitId as string) : undefined;
    const data = await ReportService.generateDeviceReport(unitId);
    return res.json(success(data));
  },

  async maintenanceReport(req: Request, res: Response) {
    const { startDate, endDate } = req.query;
    const data = await ReportService.generateMaintenanceReport(startDate as string, endDate as string);
    return res.json(success(data));
  },

  async patrolReport(req: Request, res: Response) {
    const { startDate, endDate } = req.query;
    const data = await ReportService.generatePatrolReport(startDate as string, endDate as string);
    return res.json(success(data));
  },
};
