import type { Request, Response } from 'express';
export declare const AlarmController: {
    getDetail(req: Request, res: Response): Promise<void>;
    list(req: Request, res: Response): Promise<void>;
    stats(req: Request, res: Response): Promise<void>;
    create(req: Request, res: Response): Promise<void>;
    confirm(req: Request, res: Response): Promise<void>;
    handle(req: Request, res: Response): Promise<void>;
    dismiss(req: Request, res: Response): Promise<void>;
    /** 告警消音：联动设备反控消音（需关联 device_id） */
    silence(req: Request, res: Response): Promise<void>;
    recent(req: Request, res: Response): Promise<void>;
    trend(req: Request, res: Response): Promise<void>;
};
//# sourceMappingURL=alarm.controller.d.ts.map