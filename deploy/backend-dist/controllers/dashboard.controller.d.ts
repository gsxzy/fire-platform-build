import type { Request, Response } from 'express';
export declare const DashboardController: {
    workbench(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    monitorOverview(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    bigScreen(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deviceAnalysis(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    alarmAnalysis(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    maintenanceAnalysis(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    hazardAnalysis(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    patrolCompletion(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    gisPoints(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    gisSituation(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    gisAlarmPoints(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    dailyReport(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    weeklyReport(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    monthlyReport(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deviceReport(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    maintenanceReport(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    patrolReport(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=dashboard.controller.d.ts.map