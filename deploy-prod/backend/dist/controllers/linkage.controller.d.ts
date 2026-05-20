import type { Request, Response } from 'express';
export declare const LinkageController: {
    list(req: Request, res: Response): Promise<void>;
    create(req: Request, res: Response): Promise<void>;
    update(req: Request, res: Response): Promise<void>;
    delete(req: Request, res: Response): Promise<void>;
    manualTrigger(req: Request, res: Response): Promise<void>;
    getStatus(req: Request, res: Response): Promise<void>;
    applyPreset(req: Request, res: Response): Promise<void>;
    getRecords(req: Request, res: Response): Promise<void>;
};
//# sourceMappingURL=linkage.controller.d.ts.map