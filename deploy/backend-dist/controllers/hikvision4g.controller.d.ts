/**
 * ═══════════════════════════════════════════════════════════════════
 * 海康4G IoT 设备接入控制器
 * 支持：NP-FY300-4G(烟感) / NP-FSC200-4G(压力) / NP-FSC210-4G(液位)
 * 接入方式：设备4G直连HTTP上报（无需JWT，使用ApiKey鉴权）
 * ═══════════════════════════════════════════════════════════════════
 */
import type { Request, Response } from 'express';
export declare const Hikvision4GController: {
    /**
     * 设备数据上报（核心入口）
     * POST /api/iot/hikvision/report
     * Header: X-Hikvision-Key: {apiKey}
     */
    report(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * 设备心跳（可选，设备可复用 report 接口上报心跳）
     * POST /api/iot/hikvision/heartbeat
     */
    heartbeat(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * 查询设备最新数据（前端调用）
     * GET /api/iot/hikvision/devices/:sn/data
     */
    getDeviceData(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * 批量查询设备数据（前端调用）
     * POST /api/iot/hikvision/batch-data
     */
    batchDeviceData(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=hikvision4g.controller.d.ts.map