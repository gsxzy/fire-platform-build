/**
 * 智能预警控制器
 * ═══════════════════════════════════════════════════════════════════
 * 架构说明：智能预警是 AI 决策的子集（智能预警 ⊂ AI）。
 * 预警记录由 AI 服务（`generateSmartAlert`）或规则引擎生成，
 * 写入 `fire_smart_alert` 表；此控制器仅负责预警的生命周期管理。
 * ═══════════════════════════════════════════════════════════════════
 */
import type { Request, Response } from 'express';
export declare const SmartAlertController: {
    alertList(req: Request, res: Response): Promise<void>;
    alertCount(req: Request, res: Response): Promise<void>;
    alertCreate(req: Request, res: Response): Promise<void>;
    alertUpdate(req: Request, res: Response): Promise<void>;
    alertDelete(req: Request, res: Response): Promise<void>;
    /** 预警确认 → 同步写入告警中心 */
    alertConfirm(req: Request, res: Response): Promise<void>;
    /** 预警处理 → 同步写入告警中心 */
    alertHandle(req: Request, res: Response): Promise<void>;
};
//# sourceMappingURL=smartAlert.controller.d.ts.map