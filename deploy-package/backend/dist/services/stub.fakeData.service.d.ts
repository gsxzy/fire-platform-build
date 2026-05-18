/**
 * ═══════════════════════════════════════════════════════════════════
 * Stub FakeData Service - 假数据/无真实实现的兼容接口
 * 所有无真实后端实现的接口统一返回 404 Not Implemented
 * ═══════════════════════════════════════════════════════════════════
 */
import { Request, Response } from 'express';
export declare function sipServerStart(req: Request, res: Response): Promise<void>;
export declare function sipServerStop(req: Request, res: Response): Promise<void>;
export declare function subsystems(req: Request, res: Response): Promise<void>;
export declare function systemMonitorMetrics(req: Request, res: Response): Promise<void>;
export declare function systemMonitorServices(req: Request, res: Response): Promise<void>;
export declare function systemMonitorLogs(req: Request, res: Response): Promise<void>;
export declare function iotPipelines(req: Request, res: Response): Promise<void>;
export declare function dutyCurrentCompat(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=stub.fakeData.service.d.ts.map