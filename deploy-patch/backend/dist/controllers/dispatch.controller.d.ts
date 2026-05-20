import type { Request, Response } from 'express';
export declare const DispatchController: {
    list(req: Request, res: Response): Promise<void>;
    byId(req: Request, res: Response): Promise<void>;
    stats(req: Request, res: Response): Promise<void>;
    /** 派单 */
    dispatch(req: Request, res: Response): Promise<void>;
    /** 转派 */
    transfer(req: Request, res: Response): Promise<void>;
    /** 开始处置 */
    startHandling(req: Request, res: Response): Promise<void>;
    /** 完成处置 */
    resolve(req: Request, res: Response): Promise<void>;
    /** 标记误报 */
    markFalseAlarm(req: Request, res: Response): Promise<void>;
    /** 从告警创建处置记录（Webhook/内部调用） */
    createFromAlarm(req: Request, res: Response): Promise<void>;
};
//# sourceMappingURL=dispatch.controller.d.ts.map