import type { Request, Response } from 'express';
export declare const DashboardController: {
    workbench(req: Request, res: Response): Promise<void>;
    monitorOverview(req: Request, res: Response): Promise<void>;
    bigScreen(req: Request, res: Response): Promise<void>;
    bigScreenConfig(req: Request, res: Response): Promise<void>;
    deviceAnalysis(req: Request, res: Response): Promise<void>;
    alarmAnalysis(req: Request, res: Response): Promise<void>;
    maintenanceAnalysis(req: Request, res: Response): Promise<void>;
    hazardAnalysis(req: Request, res: Response): Promise<void>;
    patrolCompletion(req: Request, res: Response): Promise<void>;
    gisPoints(req: Request, res: Response): Promise<void>;
    gisSituation(req: Request, res: Response): Promise<void>;
    gisAlarmPoints(req: Request, res: Response): Promise<void>;
    gisAlarmHeatmap(req: Request, res: Response): Promise<void>;
    dailyReport(req: Request, res: Response): Promise<void>;
    weeklyReport(req: Request, res: Response): Promise<void>;
    monthlyReport(req: Request, res: Response): Promise<void>;
    deviceReport(req: Request, res: Response): Promise<void>;
    maintenanceReport(req: Request, res: Response): Promise<void>;
    patrolReport(req: Request, res: Response): Promise<void>;
    exportReport(req: Request, res: Response): Promise<void>;
};
//# sourceMappingURL=dashboard.controller.d.ts.map