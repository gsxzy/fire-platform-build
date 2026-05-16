import type { Request, Response } from 'express';
export declare const DeviceControlController: {
    sendCommand(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    remoteStartStop(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    remoteReset(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    silence(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    batchCommand(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    commandHistory(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=deviceControl.controller.d.ts.map