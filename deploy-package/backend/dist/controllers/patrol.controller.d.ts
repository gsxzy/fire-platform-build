import type { Request, Response } from 'express';
export declare const PatrolController: {
    planList(req: Request, res: Response): Promise<void>;
    planCreate(req: Request, res: Response): Promise<void>;
    planUpdate(req: Request, res: Response): Promise<void>;
    planDelete(req: Request, res: Response): Promise<void>;
    recordList(req: Request, res: Response): Promise<void>;
    recordById(req: Request, res: Response): Promise<void>;
    recordCreate(req: Request, res: Response): Promise<void>;
    recordUpdate(req: Request, res: Response): Promise<void>;
    recordDelete(req: Request, res: Response): Promise<void>;
    hazardList(req: Request, res: Response): Promise<void>;
    hazardCreate(req: Request, res: Response): Promise<void>;
    hazardUpdate(req: Request, res: Response): Promise<void>;
    hazardDelete(req: Request, res: Response): Promise<void>;
    hazardRectify(req: Request, res: Response): Promise<void>;
};
//# sourceMappingURL=patrol.controller.d.ts.map