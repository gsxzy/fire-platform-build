import type { Request, Response } from 'express';
export declare const PatrolController: {
    planList(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    planCreate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    planUpdate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    planDelete(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    recordList(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    recordById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    recordCreate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    recordUpdate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    recordDelete(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    hazardList(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    hazardCreate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    hazardUpdate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    hazardDelete(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    hazardRectify(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=patrol.controller.d.ts.map