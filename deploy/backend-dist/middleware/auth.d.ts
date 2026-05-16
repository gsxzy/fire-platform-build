import type { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: number;
                username: string;
                roles: string[];
                permissions: string[];
            };
        }
    }
}
export declare function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=auth.d.ts.map