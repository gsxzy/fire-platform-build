import type { Request, Response } from 'express';
export declare const MaintenanceController: {
    companyList(req: Request, res: Response): Promise<void>;
    companyCreate(req: Request, res: Response): Promise<void>;
    companyUpdate(req: Request, res: Response): Promise<void>;
    companyDelete(req: Request, res: Response): Promise<void>;
    contractList(req: Request, res: Response): Promise<void>;
    contractCreate(req: Request, res: Response): Promise<void>;
    contractUpdate(req: Request, res: Response): Promise<void>;
    contractDelete(req: Request, res: Response): Promise<void>;
    workOrderList(req: Request, res: Response): Promise<void>;
    workOrderCreate(req: Request, res: Response): Promise<void>;
    workOrderUpdate(req: Request, res: Response): Promise<void>;
    workOrderDelete(req: Request, res: Response): Promise<void>;
    workOrderAssign(req: Request, res: Response): Promise<void>;
    workOrderComplete(req: Request, res: Response): Promise<void>;
    stats(req: Request, res: Response): Promise<void>;
};
//# sourceMappingURL=maintenance.controller.d.ts.map