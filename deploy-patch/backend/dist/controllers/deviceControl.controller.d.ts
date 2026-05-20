import type { Request, Response } from 'express';
export declare const DeviceControlController: {
    sendCommand(req: Request, res: Response): Promise<void>;
    remoteStartStop(req: Request, res: Response): Promise<void>;
    remoteReset(req: Request, res: Response): Promise<void>;
    silence(req: Request, res: Response): Promise<void>;
    batchCommand(req: Request, res: Response): Promise<void>;
    commandHistory(req: Request, res: Response): Promise<void>;
};
//# sourceMappingURL=deviceControl.controller.d.ts.map