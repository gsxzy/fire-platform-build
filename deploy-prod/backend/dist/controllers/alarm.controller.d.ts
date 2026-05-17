import type { Request, Response } from 'express';
export declare const AlarmController: {
    getDetail(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    list(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    stats(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    create(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    confirm(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    handle(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    dismiss(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /** 告警消音：联动设备反控消音（需关联 device_id） */
    silence(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    recent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    trend(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=alarm.controller.d.ts.map