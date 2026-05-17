import type { Request, Response } from 'express';
export declare const LinkageController: {
    /**
     * 获取联动规则列表
     */
    list(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * 创建联动规则
     */
    create(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * 更新联动规则
     */
    update(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * 删除联动规则
     */
    delete(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * 手动触发联动
     */
    manualTrigger(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * 获取联动状态
     */
    getStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * 应用预设联动方案
     */
    applyPreset(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * 获取联动记录
     */
    getRecords(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=linkage.controller.d.ts.map