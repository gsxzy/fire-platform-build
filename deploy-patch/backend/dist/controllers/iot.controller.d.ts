import type { Request, Response } from 'express';
export declare const IoTController: {
    deviceList(req: Request, res: Response): Promise<void>;
    deviceCreate(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    deviceUpdate(req: Request, res: Response): Promise<void>;
    deviceDelete(req: Request, res: Response): Promise<void>;
    protocolList(req: Request, res: Response): Promise<void>;
    protocolCreate(req: Request, res: Response): Promise<void>;
    protocolUpdate(req: Request, res: Response): Promise<void>;
    protocolDelete(req: Request, res: Response): Promise<void>;
    pipelineList(req: Request, res: Response): Promise<void>;
    pipelineCreate(req: Request, res: Response): Promise<void>;
    pipelineUpdate(req: Request, res: Response): Promise<void>;
};
//# sourceMappingURL=iot.controller.d.ts.map