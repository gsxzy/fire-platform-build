import type { Request, Response } from 'express';
export declare const AuthController: {
    login(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    refresh(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    logout(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    register(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    profile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    changePassword(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=auth.controller.d.ts.map