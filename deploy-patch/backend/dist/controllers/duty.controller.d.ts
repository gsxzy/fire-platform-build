import type { Request, Response } from 'express';
export declare const DutyController: {
    scheduleList(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    scheduleById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    scheduleCreate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    scheduleUpdate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    scheduleDelete(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    checkIn(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    checkOut(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    logList(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    currentDuty(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    absenceAlert(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=duty.controller.d.ts.map