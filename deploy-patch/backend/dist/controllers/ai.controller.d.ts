import type { Request, Response } from 'express';
export declare const AIController: {
    overview(req: Request, res: Response): Promise<void>;
    executeDecision(req: Request, res: Response): Promise<void>;
    decisionList(req: Request, res: Response): Promise<void>;
    decisionCreate(req: Request, res: Response): Promise<void>;
    alertList(req: Request, res: Response): Promise<void>;
    alertConfirm(req: Request, res: Response): Promise<void>;
    alertHandle(req: Request, res: Response): Promise<void>;
};
//# sourceMappingURL=ai.controller.d.ts.map