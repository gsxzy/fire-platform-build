import type { Request, Response } from 'express';
export declare const CTWingController: {
    /** 接收 CTWing 设备数据推送 */
    report(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /** 接收 CTWing 设备状态/生命周期变更 */
    status(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
};
//# sourceMappingURL=ctwing.controller.d.ts.map