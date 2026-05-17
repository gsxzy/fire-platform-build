import type { Request, Response } from 'express';
export declare const MaintenanceController: {
    companyList(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    companyCreate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    companyUpdate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    companyDelete(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    contractList(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    contractCreate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    contractUpdate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    contractDelete(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    workOrderList(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    workOrderCreate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    workOrderUpdate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    workOrderDelete(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    workOrderAssign(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    workOrderComplete(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    stats(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=maintenance.controller.d.ts.map