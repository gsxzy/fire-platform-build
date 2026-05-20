/**
 * workbench.controller.ts — 工作台控制器（待办 + 公告）
 */
import type { Request, Response } from 'express';
export declare const WorkbenchTodoController: {
    list(req: Request, res: Response): Promise<void>;
    create(req: Request, res: Response): Promise<void>;
    update(req: Request, res: Response): Promise<void>;
    delete(req: Request, res: Response): Promise<void>;
    byId(req: Request, res: Response): Promise<void>;
    pendingCount(req: Request, res: Response): Promise<void>;
};
export declare const WorkbenchNoticeController: {
    list(req: Request, res: Response): Promise<void>;
    create(req: Request, res: Response): Promise<void>;
    update(req: Request, res: Response): Promise<void>;
    delete(req: Request, res: Response): Promise<void>;
    byId(req: Request, res: Response): Promise<void>;
};
//# sourceMappingURL=workbench.controller.d.ts.map