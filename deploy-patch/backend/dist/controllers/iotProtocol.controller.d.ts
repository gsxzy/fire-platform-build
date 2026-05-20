import type { Request, Response } from 'express';
export declare const IoTProtocolController: {
    readModbus(req: Request, res: Response): Promise<void>;
    readSNMP(req: Request, res: Response): Promise<void>;
    sendControl(req: Request, res: Response): Promise<void>;
    batchRead(req: Request, res: Response): Promise<void>;
    parseMQTT(req: Request, res: Response): Promise<void>;
};
//# sourceMappingURL=iotProtocol.controller.d.ts.map