import type { Request, Response } from 'express';
export declare const IoTController: {
    deviceList(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deviceCreate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deviceUpdate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deviceDelete(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    protocolList(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    protocolCreate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    protocolUpdate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    protocolDelete(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    pipelineList(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    pipelineCreate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    pipelineUpdate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=iot.controller.d.ts.map