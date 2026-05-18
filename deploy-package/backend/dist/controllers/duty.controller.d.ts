import type { Request, Response } from 'express';
export declare const DutyController: {
    scheduleList(req: Request, res: Response): Promise<void>;
    scheduleById(req: Request, res: Response): Promise<void>;
    scheduleCreate(req: Request, res: Response): Promise<void>;
    scheduleUpdate(req: Request, res: Response): Promise<void>;
    scheduleDelete(req: Request, res: Response): Promise<void>;
    checkIn(req: Request, res: Response): Promise<void>;
    checkOut(req: Request, res: Response): Promise<void>;
    logList(req: Request, res: Response): Promise<void>;
    currentDuty(req: Request, res: Response): Promise<void>;
    absenceAlert(req: Request, res: Response): Promise<void>;
};
//# sourceMappingURL=duty.controller.d.ts.map