import type { Request, Response } from 'express';
export declare const AIController: {
    decisionList(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    decisionCreate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    alertList(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    alertConfirm(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    alertHandle(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=ai.controller.d.ts.map