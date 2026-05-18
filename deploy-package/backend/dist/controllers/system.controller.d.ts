import type { Request, Response } from 'express';
export declare const SystemController: {
    configList(req: Request, res: Response): Promise<void>;
    configSet(req: Request, res: Response): Promise<void>;
    logList(req: Request, res: Response): Promise<void>;
    notifyTemplateList(req: Request, res: Response): Promise<void>;
    notifyTemplateCreate(req: Request, res: Response): Promise<void>;
    notifyTemplateUpdate(req: Request, res: Response): Promise<void>;
    notifyTemplateDelete(req: Request, res: Response): Promise<void>;
    screenList(req: Request, res: Response): Promise<void>;
    screenSave(req: Request, res: Response): Promise<void>;
    deptList(req: Request, res: Response): Promise<void>;
    deptCreate(req: Request, res: Response): Promise<void>;
    deptUpdate(req: Request, res: Response): Promise<void>;
    deptDelete(req: Request, res: Response): Promise<void>;
    permList(req: Request, res: Response): Promise<void>;
    dashboard(req: Request, res: Response): Promise<void>;
    modules(req: Request, res: Response): Promise<void>;
    toggleModule(req: Request, res: Response): Promise<void>;
};
//# sourceMappingURL=system.controller.d.ts.map