import type { Request, Response } from 'express';
export declare const DeviceController: {
    list(req: Request, res: Response): Promise<void>;
    create(req: Request, res: Response): Promise<void>;
    update(req: Request, res: Response): Promise<void>;
    delete(req: Request, res: Response): Promise<void>;
    stats(req: Request, res: Response): Promise<void>;
    types(req: Request, res: Response): Promise<void>;
    scrap(req: Request, res: Response): Promise<void>;
    getConfig(req: Request, res: Response): Promise<void>;
    saveConfig(req: Request, res: Response): Promise<void>;
};
//# sourceMappingURL=device.controller.d.ts.map