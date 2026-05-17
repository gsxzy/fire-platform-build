import type { Request, Response } from 'express';
export declare const PlanController: {
    planList(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    planCreate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    planUpdate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    planDelete(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    drillList(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    drillCreate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    drillUpdate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    drillDelete(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=plan.controller.d.ts.map