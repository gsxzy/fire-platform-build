/**
 * GB28181 国标设备正式控制器
 * 数据源：MySQL `gb28181_devices` 表（WVP 关闭时的 fallback）
 * 注释：生产环境 WVP 开启时，前端优先从 WVP API + IndexedDB 获取数据；
 *       此控制器仅作为非 WVP 模式的后端数据源。
 */
import type { Request, Response } from 'express';
export declare const GB28181Controller: {
    list(req: Request, res: Response): Promise<void>;
    byId(req: Request, res: Response): Promise<void>;
    create(req: Request, res: Response): Promise<void>;
    update(req: Request, res: Response): Promise<void>;
    delete(req: Request, res: Response): Promise<void>;
};
//# sourceMappingURL=gb28181.controller.d.ts.map