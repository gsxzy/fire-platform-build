import type { Request, Response } from 'express';
export declare const AIDecisionController: {
    riskAnalysis(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    filterFalseAlarm(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    situationAssessment(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    generateSmartAlert(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    trendAnalysis(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=aiDecision.controller.d.ts.map