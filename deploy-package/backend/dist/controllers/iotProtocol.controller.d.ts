import type { Request, Response } from 'express';
export declare const IoTProtocolController: {
    readModbus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    readSNMP(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    sendControl(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    batchRead(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    parseMQTT(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=iotProtocol.controller.d.ts.map