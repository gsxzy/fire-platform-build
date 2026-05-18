import type { Request, Response } from 'express';
export declare const AuthController: {
    login(req: Request, res: Response): Promise<void>;
    refresh(req: Request, res: Response): Promise<void>;
    logout(req: Request, res: Response): Promise<void>;
    register(req: Request, res: Response): Promise<void>;
    profile(req: Request, res: Response): Promise<void>;
    updateProfile(req: Request, res: Response): Promise<void>;
    changePassword(req: Request, res: Response): Promise<void>;
};
//# sourceMappingURL=auth.controller.d.ts.map