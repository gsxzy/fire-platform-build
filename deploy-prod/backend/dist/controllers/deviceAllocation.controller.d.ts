import type { Request, Response } from 'express';
export declare const DeviceAllocationController: {
    /** 待分配列表：已接入平台且尚未绑定单位 */
    listPending(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    allocate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    unallocate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    reallocate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /** 分配日志列表 */
    listLogs(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=deviceAllocation.controller.d.ts.map