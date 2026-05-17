import type { Request, Response } from 'express';
export declare const DeviceController: {
    list(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    create(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    update(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    delete(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    stats(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    types(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    scrap(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getConfig(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    saveConfig(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=device.controller.d.ts.map