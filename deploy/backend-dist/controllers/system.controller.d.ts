import type { Request, Response } from 'express';
export declare const SystemController: {
    configList(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    configSet(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    logList(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    notifyTemplateList(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    notifyTemplateCreate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    notifyTemplateUpdate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    notifyTemplateDelete(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    screenList(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    screenSave(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deptList(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deptCreate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deptUpdate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deptDelete(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    permList(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    dashboard(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    modules(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    toggleModule(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=system.controller.d.ts.map