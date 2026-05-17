import type { Request, Response } from 'express';
export declare const AILearningController: {
    /**
     * 记录故障事件
     */
    record(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * 智能诊断查询
     */
    diagnose(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * 故障统计（按类型）
     */
    statsByType(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * 故障统计（按设备）
     */
    statsByDevice(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * 更新故障记录
     */
    update(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * 故障记录列表
     */
    list(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=aiLearning.controller.d.ts.map