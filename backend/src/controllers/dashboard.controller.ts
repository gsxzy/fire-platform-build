import type { Request, Response } from 'express';
import { success, fail } from '@/utils/response';
import logger from '@/config/logger';
import { DashboardService } from '@/services/dashboard.service';
import { AnalysisService } from '@/services/analysis.service';
import { GISService } from '@/services/gis.service';
import { ReportService } from '@/services/report.service';

export const DashboardController = {
  // 工作台首页
  async workbench(req: Request, res: Response) {
    try {
      const data = await DashboardService.getWorkbenchData(req.user!.userId);
      return res.json(success(data));
    } catch (err: any) {
      logger.error(`[Dashboard] workbench 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  // 监控中心总览
  async monitorOverview(req: Request, res: Response) {
    try {
      const data = await DashboardService.getMonitorOverview();
      return res.json(success(data));
    } catch (err: any) {
      logger.error(`[Dashboard] monitorOverview 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  // 大屏数据
  async bigScreen(req: Request, res: Response) {
    try {
      const data = await DashboardService.getBigScreenData();
      return res.json(success(data));
    } catch (err: any) {
      logger.error(`[Dashboard] bigScreen 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  // 数据分析
  async deviceAnalysis(req: Request, res: Response) {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const data = await AnalysisService.deviceAnalysis(days);
      return res.json(success(data));
    } catch (err: any) {
      logger.error(`[Dashboard] deviceAnalysis 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async alarmAnalysis(req: Request, res: Response) {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const data = await AnalysisService.alarmAnalysis(days);
      return res.json(success(data));
    } catch (err: any) {
      logger.error(`[Dashboard] alarmAnalysis 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async maintenanceAnalysis(req: Request, res: Response) {
    try {
      const data = await AnalysisService.maintenanceAnalysis();
      return res.json(success(data));
    } catch (err: any) {
      logger.error(`[Dashboard] maintenanceAnalysis 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async hazardAnalysis(req: Request, res: Response) {
    try {
      const data = await AnalysisService.hazardAnalysis();
      return res.json(success(data));
    } catch (err: any) {
      logger.error(`[Dashboard] hazardAnalysis 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async patrolCompletion(req: Request, res: Response) {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const data = await AnalysisService.patrolCompletion(days);
      return res.json(success(data));
    } catch (err: any) {
      logger.error(`[Dashboard] patrolCompletion 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  // GIS地图
  async gisPoints(req: Request, res: Response) {
    try {
      const data = await GISService.getMapPoints();
      return res.json(success(data));
    } catch (err: any) {
      logger.error(`[Dashboard] gisPoints 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async gisSituation(req: Request, res: Response) {
    try {
      const data = await GISService.getRegionSituation();
      return res.json(success(data));
    } catch (err: any) {
      logger.error(`[Dashboard] gisSituation 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async gisAlarmPoints(req: Request, res: Response) {
    try {
      const data = await GISService.getAlarmPoints();
      return res.json(success(data));
    } catch (err: any) {
      logger.error(`[Dashboard] gisAlarmPoints 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  // 报表
  async dailyReport(req: Request, res: Response) {
    try {
      const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
      const data = await ReportService.generateDailyReport(date);
      return res.json(success(data));
    } catch (err: any) {
      logger.error(`[Dashboard] dailyReport 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async weeklyReport(req: Request, res: Response) {
    try {
      const endDate = (req.query.endDate as string) || new Date().toISOString().slice(0, 10);
      const data = await ReportService.generateWeeklyReport(endDate);
      return res.json(success(data));
    } catch (err: any) {
      logger.error(`[Dashboard] weeklyReport 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async monthlyReport(req: Request, res: Response) {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
      const data = await ReportService.generateMonthlyReport(year, month);
      return res.json(success(data));
    } catch (err: any) {
      logger.error(`[Dashboard] monthlyReport 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async deviceReport(req: Request, res: Response) {
    try {
      const unitId = req.query.unitId ? parseInt(req.query.unitId as string) : undefined;
      const data = await ReportService.generateDeviceReport(unitId);
      return res.json(success(data));
    } catch (err: any) {
      logger.error(`[Dashboard] deviceReport 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async maintenanceReport(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const data = await ReportService.generateMaintenanceReport(startDate as string, endDate as string);
      return res.json(success(data));
    } catch (err: any) {
      logger.error(`[Dashboard] maintenanceReport 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async patrolReport(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const data = await ReportService.generatePatrolReport(startDate as string, endDate as string);
      return res.json(success(data));
    } catch (err: any) {
      logger.error(`[Dashboard] patrolReport 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
};
